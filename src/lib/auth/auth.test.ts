import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import { REQUEST_DELETION_PATH } from "@/lib/auth/destination";
import { MAX_USER_NAME_LENGTH } from "@/lib/auth/name";
import { findSessionUser, requireSessionFromHeaders } from "@/lib/auth/session";
import { updateProfile } from "@/lib/profile/profile";
import {
  buildCookieHeaders,
  buildUniqueEmail,
  buildUniqueProviderAccountId,
  createGitHubOnlyUser,
  createOtherSession,
  createSignedInUser,
  createUnverifiedUser,
  TEST_PASSWORD,
  warmUpAuth,
} from "@/test/auth";
import { findLink, stubResend } from "@/test/email";
import { GITHUB_ACCESS_TOKEN, type Provider, signInWithProvider } from "@/test/providers";

beforeAll(warmUpAuth);

const NEW_PASSWORD = "Senha-nova-456";

describe("getAuth: login social", () => {
  it.each<Provider>(["github", "google"])(
    "vincula o %s ao Usuário que já confirmou o mesmo e-mail",
    async (provider) => {
      const { email } = await createSignedInUser();

      const response = await signInWithProvider(provider, email);

      expect(response.headers.get("location")).toBe("/biblioteca");
      expect(await findAccount(email, provider)).toBeDefined();
    },
  );

  it.each<Provider>(["github", "google"])(
    "vincula o %s mesmo quando o provedor não confirmou o e-mail, por ser provedor confiável",
    async (provider) => {
      const { email } = await createSignedInUser();

      await signInWithProvider(provider, email, { providerEmailVerified: false });

      expect(await findAccount(email, provider)).toBeDefined();
    },
  );

  it("guarda o token do GitHub cifrado", async () => {
    const { email } = await createSignedInUser();

    await signInWithProvider("github", email);

    const account = await findAccount(email, "github");
    expect(account?.accessToken).not.toContain(GITHUB_ACCESS_TOKEN);
  });

  it("cria um Usuário novo quando o e-mail ainda não tem cadastro", async () => {
    const email = buildUniqueEmail();

    await signInWithProvider("github", email);

    expect(await findAccount(email, "github")).toBeDefined();
  });

  it.each<Provider>(["github", "google"])(
    "recusa o %s quando o Usuário com o mesmo e-mail ainda não confirmou o e-mail",
    async (provider) => {
      // A recusa é logada pela lib; o log tem caso próprio abaixo
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { email } = await createUnverifiedUser();

      const response = await signInWithProvider(provider, email);

      expect(response.headers.get("location")).toContain("/entrar?error=account_not_linked");
      expect(await findAccount(email, provider)).toBeUndefined();
    },
  );

  it("loga a recusa da vinculação só com o código, sem o e-mail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { email } = await createUnverifiedUser();

    await signInWithProvider("github", email);

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("account_not_linked"));
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(email);
  });
});

describe("getAuth: cadastro por e-mail e senha", () => {
  it("cadastra sem abrir sessão e manda o link de confirmação", async () => {
    const outbox = stubResend();
    const email = buildUniqueEmail();

    const result = await signUp(email);

    expect(result.token).toBeNull();
    expect(findLink(outbox[0])).toContain("/auth/verify-email?token=");
  });

  it("o link de confirmação confirma o e-mail e já abre a sessão na /biblioteca", async () => {
    const outbox = stubResend();
    const email = buildUniqueEmail();
    await signUp(email);

    const response = await getAuth().handler(new Request(findLink(outbox[0])!));

    expect(response.headers.get("location")).toBe("/biblioteca");
    const user = await requireSessionFromHeaders(buildCookieHeaders(response.headers));
    expect(user.email).toBe(email);
  });

  it("reenvia o link a cada tentativa de entrar sem confirmar o e-mail", async () => {
    const outbox = stubResend();
    const email = buildUniqueEmail();
    await signUp(email);

    await expect(signIn(email)).rejects.toMatchObject({ body: { code: "EMAIL_NOT_VERIFIED" } });
    expect(outbox).toHaveLength(2);
  });

  it("recusa o cadastro com e-mail que já tem Usuário, com o código que a tela traduz", async () => {
    const { email } = await createGitHubOnlyUser();
    const outbox = stubResend();

    await expect(signUp(email.toUpperCase())).rejects.toMatchObject({
      body: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
    });
    expect(outbox).toHaveLength(0);
  });

  it("recusa o cadastro com senha fraca, com o código que a tela traduz", async () => {
    await expect(signUp(buildUniqueEmail(), "senha-sem-maiuscula-1")).rejects.toMatchObject({
      body: { code: "PASSWORD_TOO_WEAK" },
    });
  });
});

describe("getAuth: troca de senha", () => {
  it("troca a senha, encerra as outras Sessões, mantém o Usuário conectado e avisa por e-mail", async () => {
    const { email, headers } = await createSignedInUser();
    const otherHeaders = await createOtherSession(email);
    const outbox = stubResend();

    const response = await changePassword(headers, NEW_PASSWORD);

    expect((await findSessionUser(buildCookieHeaders(response.headers)))?.email).toBe(email);
    expect(await findSessionUser(otherHeaders)).toBeUndefined();
    expect(await createOtherSession(email, "", NEW_PASSWORD)).toBeDefined();
    expect(outbox).toMatchObject([{ to: [email], subject: "A senha do seu Stood mudou" }]);
  });

  it("recusa a senha atual errada, sem encerrar Sessões nem avisar", async () => {
    const { email, headers } = await createSignedInUser();
    const otherHeaders = await createOtherSession(email);
    const outbox = stubResend();

    await expect(changePassword(headers, NEW_PASSWORD, "Senha-errada-123")).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD" } });
    expect(await findSessionUser(otherHeaders)).toBeDefined();
    expect(outbox).toEqual([]);
  });

  it("mantém a senha trocada quando o aviso não pode ser enviado", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { email, headers } = await createSignedInUser();
    vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));

    await changePassword(headers, NEW_PASSWORD);

    expect(await createOtherSession(email, "", NEW_PASSWORD)).toBeDefined();
  });

  it("recusa a senha nova fraca, com o código que a tela traduz", async () => {
    const { headers } = await createSignedInUser();

    await expect(changePassword(headers, "senha-sem-maiuscula-1")).rejects.toMatchObject({
      body: { code: "PASSWORD_TOO_WEAK" },
    });
  });
});

describe("getAuth: nome no login pelo provedor", () => {
  it("não troca de volta o nome mudado no Perfil", async () => {
    const email = buildUniqueEmail();
    const providerAccountId = buildUniqueProviderAccountId();
    await signInWithProvider("google", email, { providerAccountId });
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

    await updateProfile(user.id, { name: "Aninha", nickname: "", bio: "" });
    const response = await signInWithProvider("google", email, { providerAccountId });

    expect((await findSessionUser(buildCookieHeaders(response.headers)))?.name).toBe("Aninha");
  });
});

describe("getAuth: nome no cadastro", () => {
  it("grava o nome aparado", async () => {
    const email = buildUniqueEmail();

    await signUp(email, TEST_PASSWORD, "  Ana  ");

    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.email, email));
    expect(user.name).toBe("Ana");
  });

  it.each(["   ", "a".repeat(MAX_USER_NAME_LENGTH + 1)])("recusa o nome %j, com o código que a tela traduz", async (name) => {
    await expect(signUp(buildUniqueEmail(), TEST_PASSWORD, name)).rejects.toMatchObject({ body: { code: "USER_NAME_INVALID" } });
  });
});

describe("getAuth: limite de tentativas", () => {
  it.each([
    ["trocar a senha", "/change-password", { currentPassword: "Senha-errada-123", newPassword: NEW_PASSWORD }],
    ["pedir o link de apagar", REQUEST_DELETION_PATH, { email: "outra@stood.test" }],
  ])("recusa a quarta tentativa de %s em 10 segundos", async (_case, path, body) => {
    const { headers } = await createSignedInUser();
    const handle = await buildProductionHandler();

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt++) statuses.push((await handle(headers, path, body)).status);

    expect(statuses.map((status) => status === 429)).toEqual([false, false, false, true]);
  });
});

// --- Funções auxiliares ---

function signUp(email: string, password = TEST_PASSWORD, name = "Ana Souza") {
  return getAuth().api.signUpEmail({
    body: { name, email, password, callbackURL: "/biblioteca" },
  });
}

function changePassword(headers: Headers, newPassword: string, currentPassword = TEST_PASSWORD) {
  return getAuth().api.changePassword({ body: { currentPassword, newPassword }, headers, returnHeaders: true });
}

function signIn(email: string) {
  return getAuth().api.signInEmail({ body: { email, password: TEST_PASSWORD, callbackURL: "/biblioteca" } });
}

async function findAccount(email: string, provider: Provider) {
  const [account] = await db
    .select({ id: accounts.id, accessToken: accounts.accessToken })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(and(eq(users.email, email), eq(accounts.providerId, provider)))
    .limit(1);
  return account;
}

// A lib só limita tentativas em produção, então o caso monta uma instância nova como se estivesse nela
async function buildProductionHandler() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");
  vi.resetModules();
  const { getAuth: getProductionAuth } = await import("@/lib/auth/auth");
  const ip = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
  return (headers: Headers, path: string, body: object) =>
    getProductionAuth().handler(
      new Request(`${process.env.BETTER_AUTH_URL}/auth${path}`, {
        method: "POST",
        headers: {
          cookie: headers.get("cookie")!,
          "content-type": "application/json",
          origin: process.env.BETTER_AUTH_URL!,
          "x-forwarded-for": ip,
        },
        body: JSON.stringify(body),
      }),
    );
}
