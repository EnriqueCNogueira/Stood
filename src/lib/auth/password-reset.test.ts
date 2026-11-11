import { and, eq, like } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, users, verifications } from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import { requireSessionFromHeaders } from "@/lib/auth/session";
import { buildUniqueEmail, createGitHubOnlyUser, createSignedInUser, expectRedirectToSignIn, warmUpAuth } from "@/test/auth";
import { findLink, type SentEmail, stubResend } from "@/test/email";

beforeAll(warmUpAuth);

describe("sendPasswordReset", () => {
  it("manda o link de troca para quem tem Conta de e-mail e senha", async () => {
    const { email } = await createSignedInUser();
    const outbox = stubResend();

    await requestPasswordReset(email);

    expect(findLink(outbox[0])).toContain("/auth/reset-password/");
  });

  it("trocar a senha pelo link encerra as outras sessões do Usuário", async () => {
    const { email, headers } = await createSignedInUser();
    const outbox = stubResend();
    await requestPasswordReset(email);

    await getAuth().api.resetPassword({
      body: { token: buildResetToken(outbox[0]), newPassword: "Senha-nova-456" },
    });

    await expectRedirectToSignIn(requireSessionFromHeaders(headers));
  });

  it("sem Conta de senha, manda e-mail sem link dizendo que a pessoa entra pelo GitHub", async () => {
    const { email } = await createGitHubOnlyUser();
    const outbox = stubResend();

    await requestPasswordReset(email);

    expect(findLink(outbox[0])).toBeUndefined();
    expect(outbox[0].text).toContain("GitHub");
  });

  it("sem Conta de senha, não deixa token de troca válido nem cria Conta de senha", async () => {
    const { email, userId } = await createGitHubOnlyUser();
    stubResend();

    await requestPasswordReset(email);

    expect(await findResetTokens(userId)).toEqual([]);
    expect(await findCredentialAccount(userId)).toBeUndefined();
  });

  it("sem Conta nenhuma, manda e-mail dizendo que a pessoa entra pelo Google ou pelo GitHub", async () => {
    const email = await createUserWithoutAccount();
    const outbox = stubResend();

    await requestPasswordReset(email);

    expect(outbox[0].text).toContain("Google ou GitHub");
  });

  it("recusa senha nova fraca, com o código que a tela traduz", async () => {
    const { email } = await createSignedInUser();
    const outbox = stubResend();
    await requestPasswordReset(email);

    const resetWithWeakPassword = getAuth().api.resetPassword({
      body: { token: buildResetToken(outbox[0]), newPassword: "senha-sem-maiuscula-1" },
    });

    await expect(resetWithWeakPassword).rejects.toMatchObject({ body: { code: "PASSWORD_TOO_WEAK" } });
  });
});

// --- Funções auxiliares ---

function requestPasswordReset(email: string) {
  return getAuth().api.requestPasswordReset({ body: { email, redirectTo: "/redefinir-senha" } });
}

// O token é o último trecho do caminho do link: /auth/reset-password/<token>?callbackURL=...
function buildResetToken(email: SentEmail) {
  const link = new URL(findLink(email)!);
  return link.pathname.split("/").at(-1)!;
}

// Usuário sem nenhuma Conta, como o que sobra se a Conta de um provedor for apagada
async function createUserWithoutAccount() {
  const email = buildUniqueEmail();
  await db.insert(users).values({ name: "Ana Souza", email, emailVerified: true });
  return email;
}

function findResetTokens(userId: string) {
  return db
    .select({ id: verifications.id })
    .from(verifications)
    .where(and(eq(verifications.value, userId), like(verifications.identifier, "reset-password:%")));
}

async function findCredentialAccount(userId: string) {
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
    .limit(1);
  return account;
}
