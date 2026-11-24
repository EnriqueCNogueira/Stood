import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { profilePhotos, profiles, users } from "@/db/schema";
import { buildTodayInBrasilia } from "@/lib/agenda/rules";
import { type UserNameReason, validateUserName } from "@/lib/auth/name";
import {
  type BioReason,
  findMood,
  findMoodOfDay,
  type Mood,
  type NicknameReason,
  type PhotoReason,
  validateBio,
  validateNickname,
  validatePhoto,
} from "@/lib/profile/rules";

export type Profile = { nickname: string | null; bio: string | null; mood: Mood | null; photoVersion: number | null };

export type ProfileDetailsInput = { name: string; nickname: string; bio: string };
export type UpdateProfileDetailsResult =
  | { ok: true; name: string; nickname: string | null; bio: string | null }
  | { ok: false; reason: UserNameReason | NicknameReason | BioReason };
export type UpdateMoodResult = { ok: true } | { ok: false; reason: "humor-invalido" };
export type UpsertPhotoResult = { ok: true } | { ok: false; reason: PhotoReason };

// Perfil do Usuário, sem os bytes da Foto; o Humor de outro dia não aparece
export async function getProfile(userId: string, now = new Date()): Promise<Profile> {
  const [[row], [photo]] = await Promise.all([
    db
      .select({ nickname: profiles.nickname, bio: profiles.bio, mood: profiles.mood, moodDay: profiles.moodDay })
      .from(profiles)
      .where(eq(profiles.ownerId, userId))
      .limit(1),
    db.select({ updatedAt: profilePhotos.updatedAt }).from(profilePhotos).where(eq(profilePhotos.ownerId, userId)).limit(1),
  ]);
  return {
    nickname: row?.nickname ?? null,
    bio: row?.bio ?? null,
    mood: (row && findMoodOfDay(row.mood, row.moodDay, buildTodayInBrasilia(now))) ?? null,
    photoVersion: photo?.updatedAt.getTime() ?? null,
  };
}

// Uma leitura por requisição, dividida entre o cabeçalho e a página
export const getRequestProfile = cache((userId: string) => getProfile(userId));

// Nome, Apelido e Bio são gravados juntos: um recusado não muda nenhum
export async function updateProfileDetails(userId: string, input: ProfileDetailsInput): Promise<UpdateProfileDetailsResult> {
  const name = validateUserName(input.name);
  if (!name.ok) return name;
  const nickname = validateNickname(input.nickname);
  if (!nickname.ok) return nickname;
  const bio = validateBio(input.bio);
  if (!bio.ok) return bio;

  const details = { nickname: nickname.nickname, bio: bio.bio };
  await db.transaction(async (tx) => {
    await tx.update(users).set({ name: name.name }).where(eq(users.id, userId));
    await tx
      .insert(profiles)
      .values({ ownerId: userId, ...details })
      .onConflictDoUpdate({ target: profiles.ownerId, set: details });
  });
  return { ok: true, name: name.name, ...details };
}

// Só o último Humor é guardado, com o dia de Brasília; nulo tira os dois
export async function updateMood(userId: string, moodId: string | null, now = new Date()): Promise<UpdateMoodResult> {
  const mood = moodId === null ? null : findMood(moodId);
  if (mood === undefined) return { ok: false, reason: "humor-invalido" };

  const values = { mood: mood?.id ?? null, moodDay: mood ? buildTodayInBrasilia(now) : null };
  await db
    .insert(profiles)
    .values({ ownerId: userId, ...values })
    .onConflictDoUpdate({ target: profiles.ownerId, set: values });
  return { ok: true };
}

export async function upsertPhoto(userId: string, bytes: Uint8Array, now = new Date()): Promise<UpsertPhotoResult> {
  const validation = validatePhoto(bytes);
  if (!validation.ok) return validation;

  const values = { data: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), updatedAt: now };
  await db
    .insert(profilePhotos)
    .values({ ownerId: userId, ...values })
    .onConflictDoUpdate({ target: profilePhotos.ownerId, set: values });
  return { ok: true };
}

export async function deletePhoto(userId: string): Promise<void> {
  await db.delete(profilePhotos).where(eq(profilePhotos.ownerId, userId));
}

// Bytes da Foto do próprio Usuário, para o route handler servir
export async function findPhoto(userId: string): Promise<Buffer | undefined> {
  const [photo] = await db.select({ data: profilePhotos.data }).from(profilePhotos).where(eq(profilePhotos.ownerId, userId)).limit(1);
  return photo?.data;
}
