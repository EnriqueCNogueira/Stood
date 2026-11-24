import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { type FileType, fileBlobs, files, stoods } from "@/db/schema";
import { isConstraintViolation } from "@/lib/constraint";
import { EMPTY_DRAWING_CONTENT, MAX_DRAWING_LENGTH, parseDrawingScene } from "@/lib/drawing/scene";
import { type ImageType, MAX_IMAGE_BYTES, parseImageType } from "@/lib/file/image";
import { MAX_NOTE_LENGTH } from "@/lib/file/note";
import { type NameReason, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";
import { isYouTubeVideoId } from "@/lib/video/link";

type CreateRootFileReason = NameReason | "nome-repetido" | "stood-nao-encontrado" | "pasta-nao-encontrada";
type CreateRootFileResult = { ok: true; file: StoodTreeFile } | { ok: false; reason: CreateRootFileReason };

export type CreateVideoFileResult = CreateRootFileResult | { ok: false; reason: "video-invalido" };
export type CreateNoteFileResult = CreateRootFileResult;
export type CreateImageFileResult =
  | CreateRootFileResult
  | { ok: false; reason: "imagem-vazia" | "imagem-grande" | "formato-nao-suportado" };
export type CreateDrawingFileResult = CreateRootFileResult;
export type UpdateNoteContentResult = { ok: true } | { ok: false; reason: "nota-longa" | "nota-nao-encontrada" };
export type UpdateDrawingContentResult = { ok: true } | { ok: false; reason: "desenho-invalido" | "desenho-nao-encontrado" };
export type UpdateFileNameResult =
  | { ok: true; name: string }
  | { ok: false; reason: NameReason | "nome-repetido" | "arquivo-nao-encontrado" };
export type DeleteFileResult = { ok: true } | { ok: false; reason: "arquivo-nao-encontrado" };

// folderId nulo ou ausente é a raiz do Stood
type RootFileInput = { stoodId: string; folderId?: string | null; name: string };
// Tipos que o Usuário edita na Janela e salvam sozinhos
const EDITABLE_TYPES = ["note", "drawing"] as const satisfies FileType[];
type EditableType = (typeof EDITABLE_TYPES)[number];
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type InsertExtra = (tx: Transaction, fileId: string) => Promise<unknown>;

const NAME_UNIQUE_CONSTRAINT = "files_stood_id_folder_id_type_name_unique";
// A FK composta (stood_id, owner_id) recusa Stood que não existe ou é de outro dono
const STOOD_OWNER_CONSTRAINT = "files_stood_id_owner_id_stoods_fk";
// A FK composta (folder_id, stood_id, owner_id) recusa Pasta que não existe, de outro Stood ou de outro dono
const FOLDER_CONSTRAINT = "files_folder_id_folders_fk";
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

export async function createDrawingFile(ownerId: string, input: RootFileInput): Promise<CreateDrawingFileResult> {
  return createRootFile(ownerId, input, "drawing", EMPTY_DRAWING_CONTENT);
}

export async function updateNoteContent(
  ownerId: string,
  input: { fileId: string; content: string },
): Promise<UpdateNoteContentResult> {
  if (!isUuid(input.fileId)) return { ok: false, reason: "nota-nao-encontrada" };
  if (input.content.length > MAX_NOTE_LENGTH) return { ok: false, reason: "nota-longa" };

  const isUpdated = await updateEditableContent(ownerId, input.fileId, "note", input.content);
  return isUpdated ? { ok: true } : { ok: false, reason: "nota-nao-encontrada" };
}

// Só grava cena no formato do editor: um JSON qualquer quebraria o Desenho ao abrir
export async function updateDrawingContent(
  ownerId: string,
  input: { fileId: string; content: string },
): Promise<UpdateDrawingContentResult> {
  if (!isUuid(input.fileId)) return { ok: false, reason: "desenho-nao-encontrado" };
  const isValidScene = input.content.length <= MAX_DRAWING_LENGTH && parseDrawingScene(input.content) !== undefined;
  if (!isValidScene) return { ok: false, reason: "desenho-invalido" };

  const isUpdated = await updateEditableContent(ownerId, input.fileId, "drawing", input.content);
  return isUpdated ? { ok: true } : { ok: false, reason: "desenho-nao-encontrado" };
}

// Conteúdo das Notas e Desenhos do Stood, pelo id do Arquivo, para o Quadro abrir as Janelas sem nova consulta
export async function getStoodEditableContents(ownerId: string, stoodId: string): Promise<Record<string, string>> {
  if (!isUuid(stoodId)) return {};

  const rows = await db
    .select({ id: files.id, content: files.content })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), eq(files.stoodId, stoodId), inArray(files.type, EDITABLE_TYPES)));
  return Object.fromEntries(rows.map((row) => [row.id, row.content ?? ""]));
}

// O nome só repete entre tipos diferentes ou em outra Pasta, como ao criar
export async function updateFileName(ownerId: string, input: { fileId: string; name: string }): Promise<UpdateFileNameResult> {
  if (!isUuid(input.fileId)) return { ok: false, reason: "arquivo-nao-encontrado" };
  const validation = validateName(input.name);
  if (!validation.ok) return validation;

  try {
    const updated = await db
      .update(files)
      .set({ name: validation.name })
      .where(and(eq(files.id, input.fileId), eq(files.ownerId, ownerId)))
      .returning({ id: files.id });
    return updated.length > 0 ? { ok: true, name: validation.name } : { ok: false, reason: "arquivo-nao-encontrado" };
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    throw error;
  }
}

// Os bytes saem em cascata; a Janela do Arquivo sai do Quadro salvo na mesma transação,
// senão todo salvamento seguinte do Quadro recusaria o id que não existe mais
export async function deleteFile(ownerId: string, fileId: string): Promise<DeleteFileResult> {
  if (!isUuid(fileId)) return { ok: false, reason: "arquivo-nao-encontrado" };

  return db.transaction(async (tx): Promise<DeleteFileResult> => {
    const [deleted] = await tx
      .delete(files)
      .where(and(eq(files.id, fileId), eq(files.ownerId, ownerId)))
      .returning({ stoodId: files.stoodId });
    if (!deleted) return { ok: false, reason: "arquivo-nao-encontrado" };

    await tx
      .update(stoods)
      .set({
        boardWindows: sql`coalesce(
          (select jsonb_agg(board_window order by position)
           from jsonb_array_elements(${stoods.boardWindows}) with ordinality as stored(board_window, position)
           where board_window ->> 'fileId' <> ${fileId}),
          '[]'::jsonb
        )`,
      })
      .where(and(eq(stoods.id, deleted.stoodId), eq(stoods.ownerId, ownerId)));
    return { ok: true };
  });
}

// O filtro de tipo impede que o texto de uma Nota sobrescreva o id de um Vídeo ou a cena de um Desenho
async function updateEditableContent(ownerId: string, fileId: string, type: EditableType, content: string) {
  const updated = await db
    .update(files)
    .set({ content })
    .where(and(eq(files.id, fileId), eq(files.ownerId, ownerId), eq(files.type, type)))
    .returning({ id: files.id });
  return updated.length > 0;
}

// Arquivo novo na raiz do Stood ou na Pasta pedida; as FKs compostas garantem no banco que o Stood e a Pasta são do dono.
// insertExtra grava, na mesma transação, o que o tipo guarda fora de files.
async function createRootFile(
  ownerId: string,
  input: RootFileInput,
  type: FileType,
  content: string | null,
  insertExtra?: InsertExtra,
): Promise<CreateRootFileResult> {
  if (!isUuid(input.stoodId)) return { ok: false, reason: "stood-nao-encontrado" };
  const folderId = input.folderId ?? null;
  if (folderId !== null && !isUuid(folderId)) return { ok: false, reason: "pasta-nao-encontrada" };
  const validation = validateName(input.name);
  if (!validation.ok) return validation;

  try {
    const file = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(files)
        .values({ ownerId, stoodId: input.stoodId, folderId, type, name: validation.name, content })
        .returning({ id: files.id, name: files.name, type: files.type });
      await insertExtra?.(tx, created.id);
      return created;
    });
    return { ok: true, file: { kind: "file", ...file } };
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    if (isConstraintViolation(error, STOOD_OWNER_CONSTRAINT)) return { ok: false, reason: "stood-nao-encontrado" };
    if (isConstraintViolation(error, FOLDER_CONSTRAINT)) return { ok: false, reason: "pasta-nao-encontrada" };
    throw error;
  }
}

function isUuid(value: string) {
  return uuidSchema.safeParse(value).success;
}
