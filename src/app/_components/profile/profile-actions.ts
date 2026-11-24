"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type DeleteAccountResult, deleteAccount } from "@/lib/auth/accounts";
import { type DeleteUserResult, deleteUserWithCode } from "@/lib/auth/deletion";
import { buildSignInPath, PROFILE_PATH } from "@/lib/auth/destination";
import { type RevokeOwnedSessionResult, revokeOtherSessions, revokeOwnedSession } from "@/lib/auth/owned-sessions";
import { requireCurrentSession, requireSession, revokeSession } from "@/lib/auth/session";
import { type UpdateMoodResult, type UpdateProfileResult, updateMood, updateProfile } from "@/lib/profile/profile";
import { MAX_PHOTO_BYTES } from "@/lib/profile/rules";

const profileInputSchema = z.object({
  name: z.string(),
  nickname: z.string(),
  bio: z.string(),
  photo: z.instanceof(File).nullable(),
  isPhotoRemoved: z.boolean(),
});
const moodInputSchema = z.object({ moodId: z.string().nullable() });
const accountInputSchema = z.object({ accountId: z.string() });
const sessionInputSchema = z.object({ sessionId: z.string() });
const codeInputSchema = z.object({ code: z.string() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type UpdateProfileActionResult = UpdateProfileResult | InvalidInput;
export type UpdateMoodActionResult = UpdateMoodResult | InvalidInput;
export type DeleteAccountActionResult = DeleteAccountResult | InvalidInput;
export type RevokeOwnedSessionActionResult = RevokeOwnedSessionResult | InvalidInput;
export type DeleteUserActionResult = DeleteUserResult | InvalidInput;

// Nome, Apelido, Bio, Humor e Foto aparecem no cabeçalho de todas as páginas, então a revalidação é do layout
export async function updateProfileAction(formData: unknown): Promise<UpdateProfileActionResult> {
  const user = await requireSession();
  if (!(formData instanceof FormData)) return { ok: false, reason: "entrada-invalida" };
  const parsed = profileInputSchema.safeParse({
    name: formData.get("name"),
    nickname: formData.get("nickname"),
    bio: formData.get("bio"),
    photo: formData.get("photo"),
    isPhotoRemoved: formData.has("isPhotoRemoved"),
  });
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const { photo, isPhotoRemoved, ...details } = parsed.data;
  // Recusa antes de ler os bytes para a memória
  if (photo && photo.size > MAX_PHOTO_BYTES) return { ok: false, reason: "foto-grande" };
  const bytes = photo ? new Uint8Array(await photo.arrayBuffer()) : undefined;
  const result = await updateProfile(user.id, { ...details, photo: isPhotoRemoved ? null : bytes });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function updateMoodAction(input: unknown): Promise<UpdateMoodActionResult> {
  const user = await requireSession();
  const parsed = moodInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await updateMood(user.id, parsed.data.moodId);
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
