import "server-only";

import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { buildVerificationEmail } from "@/lib/auth/emails";
import { isStrongPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { sendPasswordReset } from "@/lib/auth/password-reset";
import { sendEmail } from "@/lib/email/email";
import { type Env, requireEnv } from "@/lib/env";

const SECONDS_PER_DAY = 24 * 60 * 60;
const SESSION_EXPIRES_IN_SECONDS = 30 * SECONDS_PER_DAY;
const SESSION_RENEWAL_INTERVAL_SECONDS = SECONDS_PER_DAY;

type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

// Cria a instância na primeira chamada, porque o next build importa as rotas sem env
export function getAuth(): Auth {
  auth ??= createAuth(requireEnv());
  return auth;
}

function createAuth(env: Env) {
  return betterAuth({
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
      accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
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
    hooks: { before: enforceSignUpAndPasswordRules },
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    },
    // Grava os cookies da sessão quando a chamada vem de uma Server Action
    plugins: [nextCookies()],
  });
}

const PASSWORD_FIELD_BY_PATH: Record<string, string> = {
  "/sign-up/email": "password",
  "/reset-password": "newPassword",
};

const enforceSignUpAndPasswordRules = createAuthMiddleware(async (ctx) => {
  const passwordField = PASSWORD_FIELD_BY_PATH[ctx.path];
  if (!passwordField) return;

  const password = ctx.body?.[passwordField];
  if (typeof password === "string" && !isStrongPassword(password)) {
    throw new APIError("BAD_REQUEST", { code: "PASSWORD_TOO_WEAK", message: "Password too weak." });
  }

  // Só faz a verificação de email no sign-up, porque no reset-password o email já existe
  const email = ctx.body?.email;
  if (ctx.path !== "/sign-up/email" || typeof email !== "string" || !(await isEmailRegistered(email))) return;

  throw new APIError("UNPROCESSABLE_ENTITY", {
    code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    message: "User already exists. Use another email.",
  });
});

async function isEmailRegistered(email: string) {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);
  return user !== undefined;
}
