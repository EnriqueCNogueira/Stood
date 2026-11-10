import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, verifications } from "@/db/schema";
import { buildPasswordResetEmail, buildSocialOnlyPasswordResetEmail } from "@/lib/auth/emails";
import { sendEmail } from "@/lib/email/email";

type PasswordResetRequest = {
  user: { id: string; email: string };
  url: string;
  token: string;
};

const CREDENTIAL_PROVIDER_ID = "credential";
const SOCIAL_PROVIDER_NAMES: Record<string, string> = { google: "Google", github: "GitHub" };
const PASSWORD_RESET_IDENTIFIER_PREFIX = "reset-password:";

// Callback sendResetPassword da Better Auth: só quem tem Conta de e-mail e senha recebe o link
export async function sendPasswordReset({ user, url, token }: PasswordResetRequest): Promise<void> {
  const providerIds = await findProviderIds(user.id);
  if (providerIds.includes(CREDENTIAL_PROVIDER_ID)) {
    await sendEmail(buildPasswordResetEmail(user.email, url));
    return;
  }

  // Com esse token a lib criaria uma Conta de senha; sem link ele não serve, então sai do banco
  await revokePasswordResetToken(token);
  const providerNames = providerIds.map((id) => SOCIAL_PROVIDER_NAMES[id]).filter(Boolean);
  // Sem Conta conhecida, cita todos os provedores em vez de deixar o texto vazio
  const namesToShow = providerNames.length > 0 ? providerNames : Object.values(SOCIAL_PROVIDER_NAMES);
  await sendEmail(buildSocialOnlyPasswordResetEmail(user.email, namesToShow));
}

async function findProviderIds(userId: string) {
  const rows = await db.select({ providerId: accounts.providerId }).from(accounts).where(eq(accounts.userId, userId));
  return rows.map((row) => row.providerId);
}

async function revokePasswordResetToken(token: string) {
  await db.delete(verifications).where(eq(verifications.identifier, `${PASSWORD_RESET_IDENTIFIER_PREFIX}${token}`));
}
