import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, like } from "drizzle-orm";
import { db } from "@/db";
import { users, verifications } from "@/db/schema";
import { buildConfirmDeletionPath } from "@/lib/auth/destination";
import { buildDeletionEmail } from "@/lib/auth/emails";
import { isFreshSession } from "@/lib/auth/freshness";
import type { CurrentSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/email";
import { requireEnv } from "@/lib/env";

export type RequestUserDeletionResult =
  | { ok: true }
  | { ok: false; reason: "login-antigo" | "email-diferente" | "email-nao-enviado" };
export type DeleteUserResult = { ok: true } | { ok: false; reason: "link-invalido" };

const MS_PER_HOUR = 3_600_000;
const CODE_BYTES = 32;

// Manda o link de confirmar. O código fica só como hash, e o pedido novo troca o anterior.
export async function requestUserDeletion(
  { user, session }: CurrentSession,
  typedEmail: string,
  now = new Date(),
): Promise<RequestUserDeletionResult> {
  if (!isFreshSession(session.createdAt, now)) return { ok: false, reason: "login-antigo" };
  if (typedEmail.trim().toLowerCase() !== user.email.toLowerCase()) return { ok: false, reason: "email-diferente" };

  const code = randomBytes(CODE_BYTES).toString("base64url");
  const identifier = buildIdentifier(user.id);
  await db.transaction(async (tx) => {
    await tx.delete(verifications).where(eq(verifications.identifier, identifier));
    await tx.insert(verifications).values({ identifier, value: buildHash(code), expiresAt: new Date(now.getTime() + MS_PER_HOUR) });
  });

  try {
    const { BETTER_AUTH_URL } = requireEnv();
    await sendEmail(buildDeletionEmail(user.email, new URL(buildConfirmDeletionPath(code), BETTER_AUTH_URL).toString()));
  } catch {
    await db.delete(verifications).where(and(eq(verifications.identifier, identifier), eq(verifications.value, buildHash(code))));
    return { ok: false, reason: "email-nao-enviado" };
  }
  return { ok: true };
}

// Abrir o link só confere o código: quem apaga é o botão da página
export async function isDeletionCodeValid(userId: string, code: string, now = new Date()): Promise<boolean> {
  const [found] = await db
    .select({ id: verifications.id })
    .from(verifications)
    .where(buildCodeCondition(userId, code, now))
    .limit(1);
  return found !== undefined;
}

// Gasta o código e apaga o Usuário; tudo o que tem FK para ele sai em cascata. Os links em andamento não têm:
// a biblioteca guarda o id, e às vezes o e-mail, dentro do valor.
export async function deleteUserWithCode(userId: string, code: string, now = new Date()): Promise<DeleteUserResult> {
  return db.transaction(async (tx): Promise<DeleteUserResult> => {
    const used = await tx.delete(verifications).where(buildCodeCondition(userId, code, now)).returning({ id: verifications.id });
    if (used.length === 0) return { ok: false, reason: "link-invalido" };
    await tx.delete(verifications).where(like(verifications.value, `%${userId}%`));
    await tx.delete(users).where(eq(users.id, userId));
    return { ok: true };
  });
}

function buildCodeCondition(userId: string, code: string, now: Date) {
  return and(
    eq(verifications.identifier, buildIdentifier(userId)),
    eq(verifications.value, buildHash(code)),
    gt(verifications.expiresAt, now),
  );
}

function buildIdentifier(userId: string) {
  return `delete-user:${userId}`;
}

function buildHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
