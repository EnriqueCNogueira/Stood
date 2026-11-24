import { vi } from "vitest";
import { getAuth } from "@/lib/auth/auth";
import { buildCookieHeaders, buildUniqueProviderAccountId } from "@/test/auth";

export type Provider = "github" | "google";

type ProviderProfile = { email: string; providerEmailVerified: boolean; providerAccountId: number };

type ProviderOptions = { providerEmailVerified?: boolean; providerAccountId?: number };

// Exemplo de token da documentação do GitHub
export const GITHUB_ACCESS_TOKEN = "gho_16C7e42F292c6912E7710c838347Ae178B4a";

// Faz o fluxo inteiro do OAuth: pede a URL do provedor e volta pelo callback com o state e os cookies
export async function signInWithProvider(provider: Provider, email: string, options: ProviderOptions = {}) {
  const { headers, response } = await getAuth().api.signInSocial({
    body: { provider, callbackURL: "/biblioteca", errorCallbackURL: "/entrar" },
    returnHeaders: true,
  });
  return handleProviderCallback(provider, email, options, response.url!, buildCookieHeaders(headers));
}

// O mesmo fluxo, pedido por quem já está conectado, para ligar a Conta ao Usuário
export async function linkProvider(sessionHeaders: Headers, provider: Provider, email: string, options: ProviderOptions = {}) {
  const { headers, response } = await getAuth().api.linkSocialAccount({
    body: { provider, callbackURL: "/perfil", errorCallbackURL: "/perfil" },
    headers: sessionHeaders,
    returnHeaders: true,
  });
  const cookies = [sessionHeaders.get("cookie"), buildCookieHeaders(headers).get("cookie")].join("; ");
  return handleProviderCallback(provider, email, options, response.url!, new Headers({ cookie: cookies }));
}

function handleProviderCallback(provider: Provider, email: string, options: ProviderOptions, url: string, headers: Headers) {
  const state = new URL(url).searchParams.get("state");
  const { providerEmailVerified = true, providerAccountId = buildUniqueProviderAccountId() } = options;
  const fetchFromProvider = provider === "github" ? fetchFromGitHub : fetchFromGoogle;
  vi.stubGlobal("fetch", vi.fn(fetchFromProvider({ email, providerEmailVerified, providerAccountId })));

  const callbackURL = `${process.env.BETTER_AUTH_URL}/auth/callback/${provider}?code=codigo-de-teste&state=${state}`;
  return getAuth().handler(new Request(callbackURL, { headers }));
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
