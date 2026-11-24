"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type DeleteAccountResult, deleteAccount } from "@/lib/auth/accounts";
import { type DeleteUserResult, deleteUserWithCode } from "@/lib/auth/deletion";
import { buildSignInPath, PROFILE_PATH } from "@/lib/auth/destination";
import {
  type RevokeOwnedSessionResult,
  type UpdateUserNameResult,
  revokeOtherSessions,
  revokeOwnedSession,
  updateUserName,
} from "@/lib/auth/profile";
import { requireCurrentSession, requireSession, revokeSession } from "@/lib/auth/session";

const nameInputSchema = z.object({ name: z.string() });
const accountInputSchema = z.object({ accountId: z.string() });
const sessionInputSchema = z.object({ sessionId: z.string() });
const codeInputSchema = z.object({ code: z.string() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type UpdateUserNameActionResult = UpdateUserNameResult | InvalidInput;
export type DeleteAccountActionResult = DeleteAccountResult | InvalidInput;
export type RevokeOwnedSessionActionResult = RevokeOwnedSessionResult | InvalidInput;
export type DeleteUserActionResult = DeleteUserResult | InvalidInput;

// O nome aparece no cabeçalho de todas as páginas, então a revalidação é do layout
export async function updateUserNameAction(input: unknown): Promise<UpdateUserNameActionResult> {
  const user = await requireSession();
  const parsed = nameInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await updateUserName(user.id, parsed.data.name);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteAccountAction(input: unknown): Promise<DeleteAccountActionResult> {
  const current = await requireCurrentSession();
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await deleteAccount(current, parsed.data.accountId);
  if (result.ok) revalidatePath(PROFILE_PATH);
  return result;
}

export async function revokeOwnedSessionAction(input: unknown): Promise<RevokeOwnedSessionActionResult> {
  const current = await requireCurrentSession();
  const parsed = sessionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await revokeOwnedSession(current, parsed.data.sessionId);
  revalidatePath(PROFILE_PATH);
  return result;
}

export async function revokeOtherSessionsAction(): Promise<void> {
  await revokeOtherSessions(await requireCurrentSession());
  revalidatePath(PROFILE_PATH);
}

// "Entrar de novo": encerra a Sessão atual e volta ao Perfil depois do login
export async function signInAgain() {
  await requireSession();
  await revokeSession(await headers());
  redirect(buildSignInPath(PROFILE_PATH));
}

// O botão final de apagar; o cookie da Sessão que já não existe sai junto
export async function deleteUserAction(input: unknown): Promise<DeleteUserActionResult> {
  const user = await requireSession();
  const parsed = codeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await deleteUserWithCode(user.id, parsed.data.code);
  if (!result.ok) return result;
  await revokeSession(await headers());
  redirect("/?cadastro=apagado");
}
