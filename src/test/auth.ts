import { eq, sql } from "drizzle-orm";
import { expect } from "vitest";
import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";

export const TEST_PASSWORD = "Senha-de-teste-123";

// Inicializa a lib, o banco e o hash da senha na primeira vez
export async function warmUpAuth() {
  const context = await getAuth().$context;
  await db.execute(sql`select 1`);
  await context.password.hash(TEST_PASSWORD);
}

// E-mail único por caso, porque os arquivos rodam em paralelo contra o mesmo banco
export function buildUniqueEmail() {
  return `pessoa-${crypto.randomUUID()}@stood.test`;
}

// Id da Conta no provedor único por caso, senão a lib acha a Conta de outro caso e entra com ela
export function buildUniqueProviderAccountId() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

// Usuário que só entra pelo GitHub: e-mail confirmado e nenhuma Conta de senha
export async function createGitHubOnlyUser() {
  const email = buildUniqueEmail();
  const [user] = await db
    .insert(users)
    .values({ name: "Ana Souza", email, emailVerified: true })
    .returning({ id: users.id });
  await db.insert(accounts).values({
    userId: user.id,
    providerId: "github",
    accountId: String(buildUniqueProviderAccountId()),
    updatedAt: new Date(),
  });
  return { email, userId: user.id };
}

// Cadastro por e-mail e senha, ainda sem confirmar o e-mail
export async function createUnverifiedUser(email = buildUniqueEmail()) {
  await getAuth().api.signUpEmail({ body: { name: "Ana Souza", email, password: TEST_PASSWORD } });
  return { email };
}

// Cadastro com e-mail confirmado e uma sessão aberta; devolve os cabeçalhos com o cookie da sessão
export async function createSignedInUser() {
  const { email } = await createUnverifiedUser();
  const [user] = await db.update(users).set({ emailVerified: true }).where(eq(users.email, email)).returning({ id: users.id });

  const { headers } = await getAuth().api.signInEmail({
    body: { email, password: TEST_PASSWORD },
    returnHeaders: true,
  });
  return { email, userId: user.id, headers: buildCookieHeaders(headers) };
}

// Outra Sessão do mesmo Usuário, como a de outro navegador
export async function createOtherSession(email: string, userAgent = "", password = TEST_PASSWORD) {
  const { headers } = await getAuth().api.signInEmail({
    body: { email, password },
    headers: new Headers({ "user-agent": userAgent }),
    returnHeaders: true,
  });
  return buildCookieHeaders(headers);
}

// Muda a data de criação das Sessões do Usuário, para testar o login recente
export async function setSessionsCreatedAt(userId: string, createdAt: Date) {
  await db.update(sessions).set({ createdAt }).where(eq(sessions.userId, userId));
}

// Grava a validade direto no banco, que é como se controla o relógio do Postgres
export async function setSessionsExpiresAt(email: string, expiresAt: Date) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  await db
    .update(sessions)
    .set({ expiresAt })
    .where(eq(sessions.userId, user.id));
}

// Transforma os Set-Cookie de uma resposta no cabeçalho Cookie da próxima requisição
export function buildCookieHeaders(responseHeaders: Headers) {
  const cookie = responseHeaders
    .getSetCookie()
    .map((setCookie) => setCookie.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

// redirect() do Next interrompe com um erro cujo digest leva o destino
export async function expectRedirectToSignIn(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ digest: expect.stringContaining(";/entrar;") });
}
