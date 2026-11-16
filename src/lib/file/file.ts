import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { type FileType, fileBlobs, files } from "@/db/schema";
import { isConstraintViolation } from "@/lib/constraint";
import { type ImageType, MAX_IMAGE_BYTES, parseImageType } from "@/lib/file/image";
import { MAX_NOTE_LENGTH } from "@/lib/file/note";
import { type NameReason, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";
import { isYouTubeVideoId } from "@/lib/video/link";

type CreateRootFileReason = NameReason | "nome-repetido" | "stood-nao-encontrado";
type CreateRootFileResult = { ok: true; file: StoodTreeFile } | { ok: false; reason: CreateRootFileReason };

export type CreateVideoFileResult = CreateRootFileResult | { ok: false; reason: "video-invalido" };
export type CreateNoteFileResult = CreateRootFileResult;
export type CreateImageFileResult =
  | CreateRootFileResult
  | { ok: false; reason: "imagem-vazia" | "imagem-grande" | "formato-nao-suportado" };
export type UpdateNoteContentResult = { ok: true } | { ok: false; reason: "nota-longa" | "nota-nao-encontrada" };

type RootFileInput = { stoodId: string; name: string };
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type InsertExtra = (tx: Transaction, fileId: string) => Promise<unknown>;

const NAME_UNIQUE_CONSTRAINT = "files_stood_id_folder_id_type_name_unique";
// A FK composta (stood_id, owner_id) recusa Stood que não existe ou é de outro dono
const STOOD_OWNER_CONSTRAINT = "files_stood_id_owner_id_stoods_fk";
const uuidSchema = z.uuid();

export async function createVideoFile(
  ownerId: string,
  input: RootFileInput & { videoId: string },
): Promise<CreateVideoFileResult> {
  if (!isYouTubeVideoId(input.videoId)) return { ok: false, reason: "video-invalido" };
  const result = await createRootFile(ownerId, input, "video", input.videoId);
  return result.ok ? { ok: true, file: { ...result.file, videoId: input.videoId } } : result;
}

export async function createNoteFile(ownerId: string, input: RootFileInput): Promise<CreateNoteFileResult> {
  return createRootFile(ownerId, input, "note", "");
}

// Arquivo e bytes entram na mesma transação: nome repetido ou Stood alheio não deixa bytes soltos
export async function createImageFile(
  ownerId: string,
  input: RootFileInput & { bytes: Uint8Array },
): Promise<CreateImageFileResult> {
  const { bytes } = input;
  if (bytes.length === 0) return { ok: false, reason: "imagem-vazia" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, reason: "imagem-grande" };
  const mimeType = parseImageType(bytes);
  if (!mimeType) return { ok: false, reason: "formato-nao-suportado" };

  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return createRootFile(ownerId, input, "image", null, (tx, fileId) =>
    tx.insert(fileBlobs).values({ fileId, ownerId, mimeType, data }),
  );
}

// Bytes da Imagem para o route handler servir; a de outro dono não é achada
export async function findImage(ownerId: string, fileId: string): Promise<{ mimeType: ImageType; data: Buffer } | undefined> {
  if (!isUuid(fileId)) return undefined;

  const [image] = await db
    .select({ mimeType: fileBlobs.mimeType, data: fileBlobs.data })
    .from(fileBlobs)
    .where(and(eq(fileBlobs.fileId, fileId), eq(fileBlobs.ownerId, ownerId)))
    .limit(1);
  // O CHECK de file_blobs só aceita os formatos de IMAGE_TYPES
  return image ? { mimeType: image.mimeType as ImageType, data: image.data } : undefined;
}

// O filtro de tipo impede que o texto sobrescreva o id de um Vídeo ou a cena de um Desenho
export async function updateNoteContent(
  ownerId: string,
  input: { fileId: string; content: string },
): Promise<UpdateNoteContentResult> {
  if (!isUuid(input.fileId)) return { ok: false, reason: "nota-nao-encontrada" };
  if (input.content.length > MAX_NOTE_LENGTH) return { ok: false, reason: "nota-longa" };

  const updated = await db
    .update(files)
    .set({ content: input.content })
    .where(and(eq(files.id, input.fileId), eq(files.ownerId, ownerId), eq(files.type, "note")))
    .returning({ id: files.id });
  return updated.length > 0 ? { ok: true } : { ok: false, reason: "nota-nao-encontrada" };
}

// Texto de todas as Notas do Stood, pelo id do Arquivo, para o Quadro abrir as Janelas sem nova consulta
export async function getStoodNoteContents(ownerId: string, stoodId: string): Promise<Record<string, string>> {
  if (!isUuid(stoodId)) return {};

  const rows = await db
    .select({ id: files.id, content: files.content })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), eq(files.stoodId, stoodId), eq(files.type, "note")));
  return Object.fromEntries(rows.map((row) => [row.id, row.content ?? ""]));
}

// Arquivo novo na raiz do Stood; a FK composta garante no banco que o Stood é do dono.
// insertExtra grava, na mesma transação, o que o tipo guarda fora de files.
async function createRootFile(
  ownerId: string,
  input: RootFileInput,
  type: FileType,
  content: string | null,
  insertExtra?: InsertExtra,
): Promise<CreateRootFileResult> {
  if (!isUuid(input.stoodId)) return { ok: false, reason: "stood-nao-encontrado" };
  const validation = validateName(input.name);
  if (!validation.ok) return validation;

  try {
    const file = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(files)
        .values({ ownerId, stoodId: input.stoodId, type, name: validation.name, content })
        .returning({ id: files.id, name: files.name, type: files.type });
      await insertExtra?.(tx, created.id);
      return created;
    });
    return { ok: true, file: { kind: "file", ...file } };
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    if (isConstraintViolation(error, STOOD_OWNER_CONSTRAINT)) return { ok: false, reason: "stood-nao-encontrado" };
    throw error;
  }
}

function isUuid(value: string) {
  return uuidSchema.safeParse(value).success;
}
