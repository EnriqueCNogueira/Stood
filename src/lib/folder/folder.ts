import "server-only";

import { db } from "@/db";
import { folders } from "@/db/schema";
import { isConstraintViolation } from "@/lib/constraint";
import { type NameReason, validateName } from "@/lib/stood/details";
import type { StoodTreeFolder } from "@/lib/stood/tree";
import { isUuid } from "@/lib/uuid";

export type CreateFolderResult =
  | { ok: true; folder: StoodTreeFolder }
  | { ok: false; reason: NameReason | "nome-repetido" | "stood-nao-encontrado" | "pasta-nao-encontrada" };

const NAME_UNIQUE_CONSTRAINT = "folders_stood_id_parent_id_name_unique";
// As FKs compostas recusam Stood de outro dono e Pasta pai de outro Stood ou de outro dono
const STOOD_OWNER_CONSTRAINT = "folders_stood_id_owner_id_stoods_fk";
const PARENT_CONSTRAINT = "folders_parent_id_folders_fk";

// Pasta nova na raiz do Stood (parentId nulo) ou dentro de outra Pasta do mesmo Stood
export async function createFolder(
  ownerId: string,
  input: { stoodId: string; parentId: string | null; name: string },
): Promise<CreateFolderResult> {
  if (!isUuid(input.stoodId)) return { ok: false, reason: "stood-nao-encontrado" };
  if (input.parentId !== null && !isUuid(input.parentId)) return { ok: false, reason: "pasta-nao-encontrada" };
  const validation = validateName(input.name);
  if (!validation.ok) return validation;

  try {
    const [created] = await db
      .insert(folders)
      .values({ ownerId, stoodId: input.stoodId, parentId: input.parentId, name: validation.name })
      .returning({ id: folders.id, name: folders.name });
    return { ok: true, folder: { kind: "folder", id: created.id, name: created.name, children: [] } };
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-repetido" };
    if (isConstraintViolation(error, STOOD_OWNER_CONSTRAINT)) return { ok: false, reason: "stood-nao-encontrado" };
    if (isConstraintViolation(error, PARENT_CONSTRAINT)) return { ok: false, reason: "pasta-nao-encontrada" };
    throw error;
  }
}
