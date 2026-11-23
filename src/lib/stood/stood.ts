import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { FILE_TYPES, type FileType, files, folders, stoods } from "@/db/schema";
import { type StoredBoardWindow, parseStoredWindows } from "@/lib/board/windows";
import { isConstraintViolation } from "@/lib/constraint";
import { type StoodDetailsReason, validateStoodDetails } from "@/lib/stood/details";
import { type StoodWithTree, buildSortedByName, buildStoodTree } from "@/lib/stood/tree";
import type { StoodTag } from "@/lib/tag/rules";
import {
  type StoodTagsInput,
  type Transaction,
  type UpdateStoodTagsResult,
  getTagsByStoodId,
  updateStoodTags,
} from "@/lib/tag/tag";
import { isUuid } from "@/lib/uuid";

type RecentStood = {
  id: string;
  name: string;
  description: string | null;
  lastOpenedAt: Date;
  fileCounts: Record<FileType, number>;
  tags: StoodTag[];
};

type TagsReason = Extract<UpdateStoodTagsResult, { ok: false }>["reason"];

export type CreateStoodResult =
  | { ok: true; id: string }
  | { ok: false; reason: StoodDetailsReason | "nome-repetido" | TagsReason };
export type UpdateStoodResult =
  | { ok: true; tags?: StoodTag[] }
  | { ok: false; reason: StoodDetailsReason | "nome-repetido" | "stood-nao-encontrado" | TagsReason };

// Sem tags, o Stood mantém as Tags que já tem
export type StoodInput = { name: string; description: string; tags?: StoodTagsInput };
export type InsertStoodContent = (tx: Transaction, stoodId: string) => Promise<unknown>;

const NAME_UNIQUE_CONSTRAINT = "stoods_owner_id_name_unique";
const RECENT_STOODS_LIMIT = 3;

// Recusa das Tags dentro da transação do Stood: desfaz nome e descrição junto
class TagsRefused extends Error {
  constructor(readonly reason: TagsReason) {
    super(reason);
  }
}

// Nome, descrição e Tags são gravados juntos: Tag recusada não deixa o Stood criado.
// insertContent grava, na mesma transação, as Pastas e os Arquivos iniciais: nome repetido não deixa Arquivo solto
export async function createStood(
  ownerId: string,
  input: StoodInput,
  insertContent?: InsertStoodContent,
): Promise<CreateStoodResult> {
  const validation = validateStoodDetails(input);
  if (!validation.ok) return validation;

  try {
    const id = await db.transaction(async (tx) => {
      const [stood] = await tx
        .insert(stoods)
        .values({ ownerId, ...validation.details })
        .returning({ id: stoods.id });
      await insertContent?.(tx, stood.id);
      if (input.tags) await saveTagsOrRollback(tx, ownerId, stood.id, input.tags);
      return stood.id;
    });
    return { ok: true, id };
  } catch (error) {
    if (error instanceof TagsRefused) return { ok: false, reason: error.reason };
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    throw error;
  }
}

// Editar não mexe em last_opened_at: só abrir o Quadro sobe o Stood em "Continuar de onde parou"
export async function updateStood(ownerId: string, stoodId: string, input: StoodInput): Promise<UpdateStoodResult> {
  if (!isUuid(stoodId)) return { ok: false, reason: "stood-nao-encontrado" };
  const validation = validateStoodDetails(input);
  if (!validation.ok) return validation;

  try {
    return await db.transaction(async (tx): Promise<UpdateStoodResult> => {
      const updated = await tx
        .update(stoods)
        .set(validation.details)
        .where(and(eq(stoods.id, stoodId), eq(stoods.ownerId, ownerId)))
        .returning({ id: stoods.id });
      if (updated.length === 0) return { ok: false, reason: "stood-nao-encontrado" };
      if (!input.tags) return { ok: true };
      return { ok: true, tags: await saveTagsOrRollback(tx, ownerId, stoodId, input.tags) };
    });
  } catch (error) {
    if (error instanceof TagsRefused) return { ok: false, reason: error.reason };
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    throw error;
  }
}

// Quatro queries no total, sem N+1: Stoods, Pastas, Arquivos e Tags do dono
export async function getLibraryStoods(ownerId: string): Promise<StoodWithTree[]> {
  const ownedStoods = await db
    .select({ id: stoods.id, name: stoods.name, description: stoods.description })
    .from(stoods)
    .where(eq(stoods.ownerId, ownerId));
  if (ownedStoods.length === 0) return [];

  const stoodIds = ownedStoods.map((stood) => stood.id);
  const [{ folderRows, fileRows }, tagsByStoodId] = await Promise.all([
    getTreeRows(ownerId, stoodIds),
    getTagsByStoodId(ownerId, stoodIds),
  ]);
  const foldersByStoodId = Map.groupBy(folderRows, (folder) => folder.stoodId);
  const filesByStoodId = Map.groupBy(fileRows, (file) => file.stoodId);

  return buildSortedByName(
    ownedStoods.map((stood) => ({
      ...stood,
      tags: tagsByStoodId.get(stood.id) ?? [],
      tree: buildStoodTree(foldersByStoodId.get(stood.id) ?? [], filesByStoodId.get(stood.id) ?? []),
    })),
  );
}

export async function getRecentStoods(ownerId: string): Promise<RecentStood[]> {
  const recentStoods = await db
    .select({ id: stoods.id, name: stoods.name, description: stoods.description, lastOpenedAt: stoods.lastOpenedAt })
    .from(stoods)
    .where(eq(stoods.ownerId, ownerId))
    .orderBy(desc(stoods.lastOpenedAt))
    .limit(RECENT_STOODS_LIMIT);
  if (recentStoods.length === 0) return [];

  const stoodIds = recentStoods.map((stood) => stood.id);
  const [counts, tagsByStoodId] = await Promise.all([
    db
      .select({ stoodId: files.stoodId, type: files.type, total: count() })
      .from(files)
      .where(and(eq(files.ownerId, ownerId), inArray(files.stoodId, stoodIds)))
      .groupBy(files.stoodId, files.type),
    getTagsByStoodId(ownerId, stoodIds),
  ]);
  const countsByStoodId = Map.groupBy(counts, (row) => row.stoodId);

  return recentStoods.map((stood) => ({
    ...stood,
    fileCounts: buildFileCounts(countsByStoodId.get(stood.id) ?? []),
    tags: tagsByStoodId.get(stood.id) ?? [],
  }));
}

type BoardStood = StoodWithTree & { boardWindows: StoredBoardWindow[] };

// Stood de outro dono ou id inválido devolvem undefined, para a página responder "não encontrado".
// As consultas rodam juntas: Pastas, Arquivos e Tags também filtram pelo dono, então nada de outro Usuário vaza.
export async function findBoardStood(ownerId: string, stoodId: string): Promise<BoardStood | undefined> {
  if (!isUuid(stoodId)) return undefined;

  const [[stood], { folderRows, fileRows }, tagsByStoodId] = await Promise.all([
    db
      .select({ id: stoods.id, name: stoods.name, description: stoods.description, boardWindows: stoods.boardWindows })
      .from(stoods)
      .where(and(eq(stoods.id, stoodId), eq(stoods.ownerId, ownerId)))
      .limit(1),
    getTreeRows(ownerId, [stoodId]),
    getTagsByStoodId(ownerId, [stoodId]),
  ]);
  if (!stood) return undefined;

  // Janelas fora do formato não derrubam a página: o Quadro abre vazio
  const boardWindows = parseStoredWindows(stood.boardWindows) ?? [];
  return { ...stood, boardWindows, tags: tagsByStoodId.get(stoodId) ?? [], tree: buildStoodTree(folderRows, fileRows) };
}

export async function updateStoodLastOpenedAt(ownerId: string, stoodId: string): Promise<void> {
  if (!isUuid(stoodId)) return;
  await db
    .update(stoods)
    .set({ lastOpenedAt: sql`now()` })
    .where(and(eq(stoods.id, stoodId), eq(stoods.ownerId, ownerId)));
}

async function getTreeRows(ownerId: string, stoodIds: string[]) {
  const [folderRows, fileRows] = await Promise.all([
    db
      .select({ id: folders.id, stoodId: folders.stoodId, name: folders.name, parentId: folders.parentId })
      .from(folders)
      .where(and(eq(folders.ownerId, ownerId), inArray(folders.stoodId, stoodIds))),
    db
      .select({
        id: files.id,
        stoodId: files.stoodId,
        name: files.name,
        type: files.type,
        folderId: files.folderId,
        // Só o id do Vídeo: o conteúdo de Nota e Desenho pode ser grande e não é usado na árvore
        videoId: sql<string | null>`case when ${files.type} = 'video' then ${files.content} end`,
      })
      .from(files)
      .where(and(eq(files.ownerId, ownerId), inArray(files.stoodId, stoodIds))),
  ]);
  return { folderRows, fileRows };
}

function buildFileCounts(rows: { type: FileType; total: number }[]): Record<FileType, number> {
  const counts = Object.fromEntries(FILE_TYPES.map((type) => [type, 0])) as Record<FileType, number>;
  for (const row of rows) counts[row.type] = row.total;
  return counts;
}

async function saveTagsOrRollback(tx: Transaction, ownerId: string, stoodId: string, input: StoodTagsInput) {
  const result = await updateStoodTags(tx, ownerId, stoodId, input);
  if (!result.ok) throw new TagsRefused(result.reason);
  return result.tags;
}
