import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx, sessionMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { findNewAccountEmail, findUpdatedAccountEmail, isEmailRegistered, sendAccountLinkedNotice } from "@/lib/auth/accounts";
import { requestUserDeletion } from "@/lib/auth/deletion";
import { REQUEST_DELETION_PATH } from "@/lib/auth/destination";
import { buildPasswordChangedEmail, buildVerificationEmail, sendNotice } from "@/lib/auth/emails";
import { isFreshSession } from "@/lib/auth/freshness";
import { validateUserName } from "@/lib/auth/name";
import { isStrongPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { sendPasswordReset } from "@/lib/auth/password-reset";
import { handleWithProviderProfile, updateProviderProfile } from "@/lib/auth/provider-profile";
import { SOCIAL_PROVIDERS } from "@/lib/auth/providers";
import { sendEmail } from "@/lib/email/email";
import { type Env, requireEnv } from "@/lib/env";

const SECONDS_PER_DAY = 24 * 60 * 60;
const SESSION_EXPIRES_IN_SECONDS = 30 * SECONDS_PER_DAY;
const SESSION_RENEWAL_INTERVAL_SECONDS = SECONDS_PER_DAY;

// Mesmo limite de entrar com e-mail e senha, para não deixar adivinhar a senha atual
const SENSITIVE_RATE_LIMIT = { window: 10, max: 3 };

// Rotas da biblioteca cuja regra fica no Stood (nome, Contas, Sessões e apagar) ou que ele não usa
const DISABLED_PATHS = [
  "/update-user",
  "/change-email",
  "/delete-user",
  "/delete-user/callback",
  "/list-accounts",
  "/unlink-account",
  "/account-info",
  "/get-access-token",
  "/refresh-token",
  "/list-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/verify-password",
];

type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

// Cria a instância na primeira chamada, porque o next build importa as rotas sem env
export function getAuth(): Auth {
  auth ??= createAuth(requireEnv());
  return auth;
}

function createAuth(env: Env) {
  const auth = betterAuth({
    appName: "Stood",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
    advanced: { database: { generateId: "uuid" } },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_RENEWAL_INTERVAL_SECONDS,
    },
    account: {
      encryptOAuthTokens: true,
      additionalFields: { email: { type: "string", required: false, input: false } },
      // E-mail diferente só vale para quem liga a Conta já conectado; entrar por ela continua pedindo o mesmo e-mail
      accountLinking: { enabled: true, trustedProviders: [...SOCIAL_PROVIDERS], allowDifferentEmails: true },
    },
    disabledPaths: DISABLED_PATHS,
    rateLimit: {
      // O mesmo padrão da biblioteca, escrito aqui porque ela o decide ao carregar, e o teste não conseguiria ligá-lo
      enabled: process.env.NODE_ENV === "production",
      customRules: { "/change-password": SENSITIVE_RATE_LIMIT, [REQUEST_DELETION_PATH]: SENSITIVE_RATE_LIMIT },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: sendPasswordReset,
    },
    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => sendEmail(buildVerificationEmail(user.email, url)),
    },
    hooks: { before: enforceAuthRules, after: sendPasswordChangedNotice },
    databaseHooks: {
      user: {
        create: {
          // Cadastro pelo provedor: o e-mail e senha já foi recusado antes, em enforceAuthRules
          before: async (user) => {
            if (await isEmailRegistered(user.email)) throw buildEmailRegisteredError();
            return { data: user };
          },
        },
      },
      account: {
        create: {
          before: async (account, ctx) => {
            const email = await findNewAccountEmail(account, async () => (ctx ? (await getSessionFromCtx(ctx))?.session : undefined));
            return email === false ? false : { data: { ...account, email } };
          },
          after: sendAccountLinkedNotice,
        },
        update: {
          before: async (account) => {
            const email = account.providerId && (await findUpdatedAccountEmail(account.providerId));
            return { data: email ? { ...account, email } : account };
          },
        },
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        mapProfileToUser: (profile) => updateProfileFromProvider("google", profile.sub, profile.email),
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: (profile) => updateProfileFromProvider("github", profile.id, profile.email),
      },
    },
    // Grava os cookies da sessão quando a chamada vem de uma Server Action
    plugins: [{ id: "stood-profile", endpoints: { requestDeletion: requestDeletionEndpoint } }, nextCookies()],
  });
  return { ...auth, handler: (request: Request) => handleWithProviderProfile(() => auth.handler(request)) };
}

// Rota da biblioteca, e não Server Action, porque o limite de tentativas só vale por ela
const requestDeletionEndpoint = createAuthEndpoint(
  REQUEST_DELETION_PATH,
  { method: "POST", body: z.object({ email: z.string() }), use: [sessionMiddleware] },
  async (ctx) => {
    const { user, session } = ctx.context.session;
    const result = await requestUserDeletion({ user: { ...user, image: user.image ?? null }, session }, ctx.body.email);
    if (!result.ok) throw new APIError("BAD_REQUEST", { code: result.reason, message: "Deletion request refused." });
    return ctx.json({ ok: true });
  },
);

// Guarda o perfil que o provedor enviou e não muda nada no Usuário
function updateProfileFromProvider(providerId: string, accountId: string | number, email: string | null | undefined) {
  updateProviderProfile({ providerId, accountId: String(accountId), email: email?.toLowerCase() ?? null });
  return {};
}

const PASSWORD_FIELD_BY_PATH: Record<string, string> = {
  "/sign-up/email": "password",
  "/reset-password": "newPassword",
  "/change-password": "newPassword",
};

// Regras que valem mesmo para quem chama a rota fora da tela
const enforceAuthRules = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/link-social") {
    const current = await getSessionFromCtx(ctx);
    if (current && !isFreshSession(current.session.createdAt)) {
      throw new APIError("FORBIDDEN", { code: "SESSION_NOT_FRESH", message: "Session is not fresh." });
    }
    return;
  }

  const passwordField = PASSWORD_FIELD_BY_PATH[ctx.path];
  if (!passwordField) return;

  const password = ctx.body?.[passwordField];
  if (typeof password === "string" && !isStrongPassword(password)) {
    throw new APIError("BAD_REQUEST", { code: "PASSWORD_TOO_WEAK", message: "Password too weak." });
  }

  // A troca no Perfil sempre encerra as outras Sessões, como a redefinição por link
  if (ctx.path === "/change-password") return { context: { ...ctx, body: { ...ctx.body, revokeOtherSessions: true } } };
  if (ctx.path !== "/sign-up/email") return;

  const validation = validateUserName(String(ctx.body?.name ?? ""));
  if (!validation.ok) throw new APIError("BAD_REQUEST", { code: "USER_NAME_INVALID", message: "Invalid name." });
  const email = ctx.body?.email;
  if (typeof email === "string" && (await isEmailRegistered(email))) throw buildEmailRegisteredError();
  return { context: { ...ctx, body: { ...ctx.body, name: validation.name } } };
});

// Aviso de senha trocada no Perfil; a redefinição por link já passa pelo e-mail
const sendPasswordChangedNotice = createAuthMiddleware(async (ctx) => {
  const user = ctx.path === "/change-password" ? ctx.context.newSession?.user : undefined;
  if (user) await sendNotice(buildPasswordChangedEmail(user.email));
});

function buildEmailRegisteredError() {
  return new APIError("UNPROCESSABLE_ENTITY", {
    code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    message: "User already exists. Use another email.",
  });
}
