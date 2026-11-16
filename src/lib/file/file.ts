import "server-only";

import { z } from "zod";
import { db } from "@/db";
import { files } from "@/db/schema";
import { isConstraintViolation } from "@/lib/constraint";
import { type NameReason, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";
import { isYouTubeVideoId } from "@/lib/video/link";

export type CreateVideoFileResult =
  | { ok: true; file: StoodTreeFile }
  | { ok: false; reason: NameReason | "nome-repetido" | "video-invalido" | "stood-nao-encontrado" };

type VideoFileInput = { stoodId: string; videoId: string; name: string };

const NAME_UNIQUE_CONSTRAINT = "files_stood_id_folder_id_type_name_unique";
// A FK composta (stood_id, owner_id) recusa Stood que não existe ou é de outro dono
const STOOD_OWNER_CONSTRAINT = "files_stood_id_owner_id_stoods_fk";
const uuidSchema = z.uuid();

// Vídeo novo na raiz do Stood; a FK composta garante no banco que o Stood é do dono
export async function createVideoFile(ownerId: string, input: VideoFileInput): Promise<CreateVideoFileResult> {
  if (!uuidSchema.safeParse(input.stoodId).success) return { ok: false, reason: "stood-nao-encontrado" };
  if (!isYouTubeVideoId(input.videoId)) return { ok: false, reason: "video-invalido" };
  const validation = validateName(input.name);
  if (!validation.ok) return validation;

  try {
    const [file] = await db
      .insert(files)
      .values({ ownerId, stoodId: input.stoodId, type: "video", name: validation.name, content: input.videoId })
      .returning({ id: files.id, name: files.name, type: files.type });
    return { ok: true, file: { kind: "file", ...file, videoId: input.videoId } };
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    if (isConstraintViolation(error, STOOD_OWNER_CONSTRAINT)) return { ok: false, reason: "stood-nao-encontrado" };
    throw error;
  }
}
