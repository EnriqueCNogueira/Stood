import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { deleteAccount, getAccounts } from "@/lib/auth/accounts";
import { getAuth } from "@/lib/auth/auth";
import { findSessionUser, requireCurrentSessionFromHeaders } from "@/lib/auth/session";
import {
  buildCookieHeaders,
  buildUniqueEmail,
  buildUniqueProviderAccountId,
  createGitHubOnlyUser,
  createOtherSession,
  createSignedInUser,
  createUnverifiedUser,
  setSessionsCreatedAt,
  TEST_PASSWORD,
  warmUpAuth,
} from "@/test/auth";
import { stubResend } from "@/test/email";
import { linkProvider, type Provider, signInWithProvider } from "@/test/providers";

beforeAll(warmUpAuth);

const MS_PER_DAY = 86_400_000;

describe("ligar uma Conta", () => {
  it.each<Provider>(["github", "google"])("liga o %s com e-mail diferente, guarda o e-mail dele e mantém o do Usuário", async (provider) => {
    const { email, userId, headers } = await createSignedInUser();
    const accountEmail = buildUniqueEmail();

    const response = await linkProvider(headers, provider, accountEmail.toUpperCase());

    expect(response.headers.get("location")).toBe("/perfil");
    expect(await getAccounts(userId)).toContainEqual(expect.objectContaining({ providerId: provider, email: accountEmail }));
    expect((await findSessionUser(headers))?.email).toBe(email);
  });

  it("liga com o mesmo e-mail do Usuário, sem trocar o nome nem a foto", async () => {
    const { email, userId, headers } = await createSignedInUser();
    await db.update(users).set({ name: "Aninha" }).where(eq(users.id, userId));

    await linkProvider(headers, "google", email);

    expect(await findSessionUser(headers)).toMatchObject({ name: "Aninha", image: null });
    expect(await getAccounts(userId)).toHaveLength(2);
  });

  it("liga uma segunda Conta do mesmo provedor", async () => {
    const { userId, headers } = await createSignedInUser();

    await linkProvider(headers, "google", buildUniqueEmail());
    await linkProvider(headers, "google", buildUniqueEmail());

    expect((await getAccounts(userId)).filter((account) => account.providerId === "google")).toHaveLength(2);
  });

  it("recusa a Conta que já entra em outro Usuário", async () => {
    silenceLibraryLog();
    const providerAccountId = buildUniqueProviderAccountId();
    const other = await createSignedInUser();
    await linkProvider(other.headers, "github", buildUniqueEmail(), { providerAccountId });
    const { userId, headers } = await createSignedInUser();

    const response = await linkProvider(headers, "github", buildUniqueEmail(), { providerAccountId });

    expect(response.headers.get("location")).toContain("/perfil?error=account_already_linked_to_different_user");
    expect(await getAccounts(userId)).toHaveLength(1);
  });

  it("recusa a Conta com o e-mail de outro Usuário", async () => {
    silenceLibraryLog();
    const other = await createSignedInUser();
    const { userId, headers } = await createSignedInUser();

    const response = await linkProvider(headers, "google", other.email);

    expect(response.headers.get("location")).toContain("/perfil?error=unable_to_link_account");
    expect(await getAccounts(userId)).toHaveLength(1);
  });

  it("recusa quando a Sessão tem mais de 1 dia, antes de sair para o provedor", async () => {
    const { userId, headers } = await createSignedInUser();
    await setSessionsCreatedAt(userId, buildTwoDaysAgo());

    await expect(linkProvider(headers, "google", buildUniqueEmail())).rejects.toMatchObject({ body: { code: "SESSION_NOT_FRESH" } });
  });

  it("avisa o Usuário por e-mail, e a falha do envio não desfaz a ligação", async () => {
    const consoleError = silenceLibraryLog();
    const { userId, headers } = await createSignedInUser();
    vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");

    // Com a chave ligada, o fetch simulado do provedor recusa o endereço do Resend
    await linkProvider(headers, "github", buildUniqueEmail());

    expect(await getAccounts(userId)).toHaveLength(2);
    expect(consoleError).toHaveBeenCalledWith("notice email failed");
  });
});

describe("e-mail da Conta no login", () => {
  it("guarda o e-mail ao criar o Usuário pelo provedor", async () => {
    const email = buildUniqueEmail();

    await signInWithProvider("google", email);

    expect(await findAccountEmail(email, "google")).toBe(email);
  });

  it("preenche o e-mail da Conta antiga no próximo login por ela", async () => {
    const { email, userId } = await createGitHubOnlyUser();

    await signInWithProvider("github", email, { providerAccountId: await getProviderAccountId(userId) });

    expect(await findAccountEmail(email, "github")).toBe(email);
  });

  it("entra mesmo quando o provedor passou a enviar o e-mail de outro Usuário, sem guardá-lo", async () => {
    const other = await createSignedInUser();
    const { email, userId } = await createGitHubOnlyUser();

    const response = await signInWithProvider("github", other.email, { providerAccountId: await getProviderAccountId(userId) });

    expect(response.headers.get("location")).toBe("/biblioteca");
    expect(await findAccountEmail(email, "github")).toBeNull();
  });
});

describe("cadastro com e-mail de uma Conta de outro Usuário", () => {
  it("recusa por e-mail e senha", async () => {
    const { headers } = await createSignedInUser();
    const accountEmail = buildUniqueEmail();
    await linkProvider(headers, "google", accountEmail);

    await expect(createUnverifiedUser(accountEmail)).rejects.toMatchObject({
      body: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
    });
  });

  it("recusa por outro provedor", async () => {
    silenceLibraryLog();
    const { headers } = await createSignedInUser();
    const accountEmail = buildUniqueEmail();
    await linkProvider(headers, "google", accountEmail);

    const response = await signInWithProvider("github", accountEmail);

    expect(response.headers.get("location")).toContain("/entrar?error=USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
  });

  it("entra, pela própria Conta, no Usuário a que ela está ligada", async () => {
    const { email, headers } = await createSignedInUser();
    const accountEmail = buildUniqueEmail();
    const providerAccountId = buildUniqueProviderAccountId();
    await linkProvider(headers, "google", accountEmail, { providerAccountId });

    const response = await signInWithProvider("google", accountEmail, { providerAccountId });

    expect((await findSessionUser(buildCookieHeaders(response.headers)))?.email).toBe(email);
  });

  it("recusa no banco a Conta com e-mail de outro Usuário e o Usuário com e-mail de Conta alheia", async () => {
    const other = await createSignedInUser();
    const { userId } = await createSignedInUser();
    const accountEmail = buildUniqueEmail();
    const row = { providerId: "google", userId, updatedAt: new Date() };

    await expect(db.insert(accounts).values({ ...row, accountId: crypto.randomUUID(), email: other.email })).rejects.toMatchObject({
      cause: { constraint: "accounts_email_of_other_user_check" },
    });
    await db.insert(accounts).values({ ...row, accountId: crypto.randomUUID(), email: accountEmail });
    await expect(db.insert(users).values({ name: "Bia", email: accountEmail })).rejects.toMatchObject({
      cause: { constraint: "users_email_of_other_account_check" },
    });
  });
});

describe("getAccounts", () => {
  it("devolve só as Contas do Usuário, com a de senha primeiro e sem nenhum token", async () => {
    const other = await createSignedInUser();
    await linkProvider(other.headers, "google", buildUniqueEmail());
    const { userId, headers } = await createSignedInUser();
    const accountEmail = buildUniqueEmail();
    await linkProvider(headers, "github", accountEmail);

    expect(await getAccounts(userId)).toEqual([
      { id: expect.any(String), providerId: "credential", email: null },
      { id: expect.any(String), providerId: "github", email: accountEmail },
    ]);
  });
});

describe("deleteAccount", () => {
  it("desliga a Conta, encerra as outras Sessões, mantém a atual e avisa por e-mail", async () => {
    const { email, userId, headers } = await createSignedInUser();
    const account = await linkGitHub(userId, headers);
    const otherHeaders = await createOtherSession(email);
    const outbox = stubResend();

    const result = await deleteAccount(await requireCurrentSessionFromHeaders(headers), account.id);

    expect(result).toEqual({ ok: true });
    expect(await getAccounts(userId)).toHaveLength(1);
    expect(await findSessionUser(otherHeaders)).toBeUndefined();
    expect(await findSessionUser(headers)).toBeDefined();
    expect(outbox).toMatchObject([{ to: [email], subject: "Uma Conta foi desligada do seu Stood" }]);
  });

  it("recusa a última Conta, mesmo com duas tentativas ao mesmo tempo", async () => {
    const response = await signInWithProvider("google", buildUniqueEmail());
    const headers = buildCookieHeaders(response.headers);
    await linkProvider(headers, "github", buildUniqueEmail());
    const session = await requireCurrentSessionFromHeaders(headers);
    const owned = await getAccounts(session.user.id);

    const results = await Promise.all(owned.map((account) => deleteAccount(session, account.id)));

    expect(results).toContainEqual({ ok: false, reason: "ultima-conta" });
    expect(await getAccounts(session.user.id)).toHaveLength(1);
  });

  it("recusa a Conta de e-mail e senha", async () => {
    const { userId, headers } = await createSignedInUser();
    await linkGitHub(userId, headers);
    const [credential] = await getAccounts(userId);

    await expect(deleteAccount(await requireCurrentSessionFromHeaders(headers), credential.id)).resolves.toEqual({
      ok: false,
      reason: "conta-de-senha",
    });
  });

  it("recusa a Conta de outro Usuário como inexistente", async () => {
    const other = await createSignedInUser();
    const otherAccount = await linkGitHub(other.userId, other.headers);
    const { headers } = await createSignedInUser();

    await expect(deleteAccount(await requireCurrentSessionFromHeaders(headers), otherAccount.id)).resolves.toEqual({
      ok: false,
      reason: "conta-nao-encontrada",
    });
    expect(await getAccounts(other.userId)).toHaveLength(2);
  });

  it.each([["que não existe", crypto.randomUUID()], ["com id inválido", "abc"]])("recusa a Conta %s", async (_case, accountId) => {
    const { headers } = await createSignedInUser();

    await expect(deleteAccount(await requireCurrentSessionFromHeaders(headers), accountId)).resolves.toEqual({
      ok: false,
      reason: "conta-nao-encontrada",
    });
  });

  it("recusa quando a Sessão tem mais de 1 dia", async () => {
    const { userId, headers } = await createSignedInUser();
    const account = await linkGitHub(userId, headers);
    await setSessionsCreatedAt(userId, buildTwoDaysAgo());

    await expect(deleteAccount(await requireCurrentSessionFromHeaders(headers), account.id)).resolves.toEqual({
      ok: false,
      reason: "login-antigo",
    });
  });
});

describe("rotas da biblioteca que o Stood não usa", () => {
  it.each([
    ["/update-user", { image: "https://exemplo.com/foto.png" }],
    ["/unlink-account", { providerId: "github" }],
    ["/revoke-sessions", {}],
    ["/verify-password", { password: TEST_PASSWORD }],
    ["/delete-user", {}],
  ])("%s não responde, porque a regra fica no Stood", async (path, body) => {
    const { headers } = await createSignedInUser();

    const response = await getAuth().handler(
      new Request(`${process.env.BETTER_AUTH_URL}/auth${path}`, {
        method: "POST",
        headers: { cookie: headers.get("cookie")!, "content-type": "application/json", origin: process.env.BETTER_AUTH_URL! },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(404);
  });
});

// --- Funções auxiliares ---

// A lib loga as recusas do login social
function silenceLibraryLog() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

function buildTwoDaysAgo() {
  return new Date(Date.now() - 2 * MS_PER_DAY);
}

async function linkGitHub(userId: string, headers: Headers) {
  await linkProvider(headers, "github", buildUniqueEmail());
  return (await getAccounts(userId)).find((account) => account.providerId === "github")!;
}

async function getProviderAccountId(userId: string) {
  const [account] = await db.select({ accountId: accounts.accountId }).from(accounts).where(eq(accounts.userId, userId)).limit(1);
  return Number(account.accountId);
}

async function findAccountEmail(userEmail: string, providerId: Provider) {
  const [account] = await db
    .select({ email: accounts.email })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(and(eq(users.email, userEmail), eq(accounts.providerId, providerId)));
  return account?.email;
}
