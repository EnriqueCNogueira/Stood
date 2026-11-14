import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { FILE_TYPES, type FileType, files, folders, stoods } from "@/db/schema";
import { type StoodDetailsReason, validateStoodDetails } from "@/lib/stood/details";
import { type StoodWithTree, buildSortedByName, buildStoodTree } from "@/lib/stood/tree";

type RecentStood = {
  id: string;
  name: string;
  description: string | null;
  lastOpenedAt: Date;
  fileCounts: Record<FileType, number>;
};

export type CreateStoodResult = { ok: true; id: string } | { ok: false; reason: StoodDetailsReason | "nome-repetido" };

type StoodDetailsInput = { name: string; description: string };

const UNIQUE_VIOLATION = "23505";
const NAME_UNIQUE_CONSTRAINT = "stoods_owner_id_name_unique";
const RECENT_STOODS_LIMIT = 3;

export async function createStood(ownerId: string, input: StoodDetailsInput): Promise<CreateStoodResult> {
  const validation = validateStoodDetails(input);
  if (!validation.ok) return validation;

  try {
    const [stood] = await db
      .insert(stoods)
      .values({ ownerId, ...validation.details })
      .returning({ id: stoods.id });
    return { ok: true, id: stood.id };
  } catch (error) {
    if (isNameUniqueViolation(error)) return { ok: false, reason: "nome-repetido" };
    throw error;
  }
}

// Três queries no total, sem N+1: Stoods, Pastas e Arquivos do dono
export async function getLibraryStoods(ownerId: string): Promise<StoodWithTree[]> {
  const ownedStoods = await db
    .select({ id: stoods.id, name: stoods.name, description: stoods.description })
    .from(stoods)
    .where(eq(stoods.ownerId, ownerId));
  if (ownedStoods.length === 0) return [];

  const { folderRows, fileRows } = await getTreeRows(
    ownerId,
    ownedStoods.map((stood) => stood.id),
  );
  const foldersByStoodId = Map.groupBy(folderRows, (folder) => folder.stoodId);
  const filesByStoodId = Map.groupBy(fileRows, (file) => file.stoodId);

  return buildSortedByName(
    ownedStoods.map((stood) => ({
      ...stood,
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

  const counts = await db
    .select({ stoodId: files.stoodId, type: files.type, total: count() })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), inArray(files.stoodId, recentStoods.map((stood) => stood.id))))
    .groupBy(files.stoodId, files.type);
  const countsByStoodId = Map.groupBy(counts, (row) => row.stoodId);

  return recentStoods.map((stood) => ({ ...stood, fileCounts: buildFileCounts(countsByStoodId.get(stood.id) ?? []) }));
}

async function getTreeRows(ownerId: string, stoodIds: string[]) {
  const [folderRows, fileRows] = await Promise.all([
    db
      .select({ id: folders.id, stoodId: folders.stoodId, name: folders.name, parentId: folders.parentId })
      .from(folders)
      .where(and(eq(folders.ownerId, ownerId), inArray(folders.stoodId, stoodIds))),
    db
      .select({ id: files.id, stoodId: files.stoodId, name: files.name, type: files.type, folderId: files.folderId })
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

// O Drizzle embrulha o erro do pg em cause; só a violação do nome único vira Result
function isNameUniqueViolation(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === UNIQUE_VIOLATION &&
    "constraint" in cause &&
    cause.constraint === NAME_UNIQUE_CONSTRAINT
  );
}
