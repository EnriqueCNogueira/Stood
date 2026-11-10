import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import { requireSessionFromHeaders } from "@/lib/auth/session";
import {
  buildCookieHeaders,
  buildUniqueEmail,
  buildUniqueProviderAccountId,
  createGitHubOnlyUser,
  createSignedInUser,
  createUnverifiedUser,
  TEST_PASSWORD,
  warmUpAuth,
} from "@/test/auth";
import { findLink, stubResend } from "@/test/email";

beforeAll(warmUpAuth);

type Provider = "github" | "google";

type ProviderProfile = { email: string; providerEmailVerified: boolean; providerAccountId: number };

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

// --- Funções auxiliares ---

function signUp(email: string, password = TEST_PASSWORD) {
  return getAuth().api.signUpEmail({
    body: { name: "Ana Souza", email, password, callbackURL: "/biblioteca" },
  });
}

function signIn(email: string) {
  return getAuth().api.signInEmail({ body: { email, password: TEST_PASSWORD, callbackURL: "/biblioteca" } });
}

// Exemplo de token da documentação do GitHub
const GITHUB_ACCESS_TOKEN = "gho_16C7e42F292c6912E7710c838347Ae178B4a";

// Faz o fluxo inteiro do OAuth: pede a URL do provedor e volta pelo callback com o state e os cookies
async function signInWithProvider(provider: Provider, email: string, { providerEmailVerified = true } = {}) {
  const { headers, response } = await getAuth().api.signInSocial({
    body: { provider, callbackURL: "/biblioteca", errorCallbackURL: "/entrar" },
    returnHeaders: true,
  });
  const state = new URL(response.url!).searchParams.get("state");

  const providerAccountId = buildUniqueProviderAccountId();
  const fetchFromProvider = provider === "github" ? fetchFromGitHub : fetchFromGoogle;
  vi.stubGlobal("fetch", vi.fn(fetchFromProvider({ email, providerEmailVerified, providerAccountId })));

  const callbackURL = `${process.env.BETTER_AUTH_URL}/auth/callback/${provider}?code=codigo-de-teste&state=${state}`;
  return getAuth().handler(new Request(callbackURL, { headers: buildCookieHeaders(headers) }));
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

// Respostas copiadas do formato real do endpoint de token, de /user e de /user/emails do GitHub
function fetchFromGitHub({ email, providerEmailVerified, providerAccountId }: ProviderProfile) {
  return async (input: RequestInfo | URL) => {
    const url = requestURL(input);
    if (url.startsWith("https://github.com/login/oauth/access_token")) {
      return Response.json({ access_token: GITHUB_ACCESS_TOKEN, token_type: "bearer", scope: "read:user,user:email" });
    }
    if (url === "https://api.github.com/user/emails") {
      return Response.json([{ email, primary: true, verified: providerEmailVerified, visibility: "private" }]);
    }
    if (url === "https://api.github.com/user") {
      return Response.json({
        login: "anasouza",
        id: providerAccountId,
        node_id: "MDQ6VXNlcjEyOTYyNjk=",
        avatar_url: `https://avatars.githubusercontent.com/u/${providerAccountId}?v=4`,
        type: "User",
        name: "Ana Souza",
        email: null,
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
}

// Resposta do endpoint de token do Google; o id_token só é decodificado no callback, sem conferir a assinatura
function fetchFromGoogle(profile: ProviderProfile) {
  return async (input: RequestInfo | URL) => {
    const url = requestURL(input);
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return Response.json({
        access_token: "ya29.a0AfH6SMBx-codigo-de-teste",
        expires_in: 3599,
        scope: "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        token_type: "Bearer",
        id_token: buildGoogleIdToken(profile),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
}

function buildGoogleIdToken({ email, providerEmailVerified, providerAccountId }: ProviderProfile) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: "chave-de-teste", typ: "JWT" };
  const payload = {
    iss: "https://accounts.google.com",
    aud: process.env.GOOGLE_CLIENT_ID,
    sub: String(providerAccountId),
    email,
    email_verified: providerEmailVerified,
    name: "Ana Souza",
    picture: "https://lh3.googleusercontent.com/a/foto-de-teste",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.assinatura-de-teste`;
}

function requestURL(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : String(input);
}
