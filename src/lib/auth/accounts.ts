import "server-only";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { buildAccountLinkedEmail, buildAccountUnlinkedEmail, sendNotice } from "@/lib/auth/emails";
import { isFreshSession } from "@/lib/auth/freshness";
import { CREDENTIAL_PROVIDER_ID, getProviderName } from "@/lib/auth/providers";
import { findProviderProfile, type ProviderProfile } from "@/lib/auth/provider-profile";
import type { CurrentSession } from "@/lib/auth/session";
import { requireOwnerLock } from "@/lib/lock";
import { isUuid } from "@/lib/uuid";

export type OwnedAccount = { id: string; providerId: string; email: string | null };

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "login-antigo" | "conta-nao-encontrada" | "conta-de-senha" | "ultima-conta" };

// Contas do Usuário, a de senha primeiro e depois por provedor e data, sem nenhum token
export async function getAccounts(userId: string): Promise<OwnedAccount[]> {
  return db
    .select({ id: accounts.id, providerId: accounts.providerId, email: accounts.email })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(sql`${accounts.providerId} <> ${CREDENTIAL_PROVIDER_ID}`, asc(accounts.providerId), asc(accounts.createdAt));
}

// Desliga o Google ou o GitHub e encerra as outras Sessões, porque o banco não guarda por qual Conta cada uma entrou.
// A trava por Usuário faz duas abas que desligam juntas deixarem pelo menos uma Conta.
export async function deleteAccount(current: CurrentSession, accountId: string): Promise<DeleteAccountResult> {
  if (!isFreshSession(current.session.createdAt)) return { ok: false, reason: "login-antigo" };
  if (!isUuid(accountId)) return { ok: false, reason: "conta-nao-encontrada" };
  const userId = current.user.id;

  const result = await db.transaction(async (tx): Promise<DeleteAccountResult & { deleted?: OwnedAccount }> => {
    await requireOwnerLock(tx, userId, "accounts");
    const owned = await tx
      .select({ id: accounts.id, providerId: accounts.providerId, email: accounts.email })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    const account = owned.find(({ id }) => id === accountId);
    if (!account) return { ok: false, reason: "conta-nao-encontrada" };
    if (account.providerId === CREDENTIAL_PROVIDER_ID) return { ok: false, reason: "conta-de-senha" };
    if (owned.length === 1) return { ok: false, reason: "ultima-conta" };

    await tx.delete(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    await tx.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, current.session.id)));
    return { ok: true, deleted: account };
  });
  if (!result.ok) return result;

  const { providerId, email } = result.deleted!;
  await sendNotice(buildAccountUnlinkedEmail(current.user.email, getProviderName(providerId), email));
  return { ok: true };
}

// O e-mail é o de um Usuário ou o de uma Conta já ligada: nos dois casos o cadastro com ele é recusado
export async function isEmailRegistered(email: string) {
  const normalized = email.toLowerCase();
  const [[user], [account]] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1),
    db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, normalized)).limit(1),
  ]);
  return user !== undefined || account !== undefined;
}

type NewAccount = { providerId: string; accountId: string; userId: string };

// Gancho de antes de criar a Conta: devolve o e-mail a gravar, ou false para recusar a ligação.
// Sem e-mail do provedor, a recusa por e-mail de outro Usuário não teria como ser conferida.
export async function findNewAccountEmail(account: NewAccount): Promise<string | null | false> {
  if (account.providerId === CREDENTIAL_PROVIDER_ID) return null;
  const email = findProviderProfile(account.providerId)?.email;
  if (!email || (await isEmailOfAnotherUser(email, account.userId))) return false;
  return email;
}

// Gancho de antes de atualizar a Conta num login: o e-mail novo, ou undefined para deixar como está.
// O e-mail que passou a ser o de outro Usuário não é guardado, mas o login segue.
export async function findUpdatedAccountEmail(providerId: string): Promise<string | undefined> {
  const profile = findProviderProfile(providerId);
  if (!profile?.email) return undefined;
  const owner = await findAccountOwner(profile);
  if (!owner || (await isEmailOfAnotherUser(profile.email, owner.userId))) return undefined;
  return profile.email;
}

// Gancho de depois de criar a Conta: avisa quem já tinha outra; a primeira é o próprio cadastro
export async function sendAccountLinkedNotice(account: NewAccount): Promise<void> {
  const owned = await getAccounts(account.userId);
  if (owned.length < 2) return;
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, account.userId)).limit(1);
  if (!user) return;
  const linked = findProviderProfile(account.providerId);
  await sendNotice(buildAccountLinkedEmail(user.email, getProviderName(account.providerId), linked?.email ?? null));
}

async function isEmailOfAnotherUser(email: string, userId: string) {
  const [other] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);
  return other !== undefined;
}

async function findAccountOwner({ providerId, accountId }: ProviderProfile) {
  const [owner] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.providerId, providerId), eq(accounts.accountId, accountId)))
    .limit(1);
  return owner;
}
