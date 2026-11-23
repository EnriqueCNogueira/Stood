import "server-only";

import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { stoodTags, stoods, tags } from "@/db/schema";
import { isConstraintViolation } from "@/lib/constraint";
import {
  MAX_TAGS_PER_STOOD,
  MAX_TAGS_PER_USER,
  type StoodTag,
  type TagNameReason,
  buildSortedTags,
  isSameTagName,
  validateTagName,
} from "@/lib/tag/rules";
import { isUuid } from "@/lib/uuid";

export type TagWithCount = StoodTag & { stoodCount: number };

// Tags escolhidas no diálogo do Stood: as que já existem, por id, e os nomes digitados que ainda não existem
export type StoodTagsInput = { tagIds: string[]; newTagNames: string[] };

export type CreateTagResult =
  | { ok: true; tag: StoodTag }
  | { ok: false; reason: TagNameReason | "nome-da-tag-repetido" | "limite-de-tags" };
export type UpdateTagNameResult =
  | { ok: true }
  | { ok: false; reason: TagNameReason | "nome-da-tag-repetido" | "tag-nao-encontrada" };
export type DeleteTagResult = { ok: true } | { ok: false; reason: "tag-nao-encontrada" };
export type UpdateTagStoodsResult = { ok: true } | { ok: false; reason: "tag-nao-encontrada" | "limite-de-tags-do-stood" };
export type UpdateStoodTagsResult =
  | { ok: true; tags: StoodTag[] }
  | { ok: false; reason: TagNameReason | "limite-de-tags" | "limite-de-tags-do-stood" };

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const NAME_UNIQUE_CONSTRAINT = "tags_owner_id_name_unique";

export async function getTags(ownerId: string): Promise<TagWithCount[]> {
  const rows = await db
    .select({ id: tags.id, name: tags.name, stoodCount: count(stoodTags.stoodId) })
    .from(tags)
    .leftJoin(stoodTags, eq(stoodTags.tagId, tags.id))
    .where(eq(tags.ownerId, ownerId))
    .groupBy(tags.id, tags.name);
  return buildSortedTags(rows);
}

export async function createTag(ownerId: string, name: string): Promise<CreateTagResult> {
  const validation = validateTagName(name);
  if (!validation.ok) return validation;

  try {
    return await db.transaction(async (tx) => {
      await lockOwnerTags(tx, ownerId);
      if ((await countOwnerTags(tx, ownerId)) >= MAX_TAGS_PER_USER) return { ok: false, reason: "limite-de-tags" };
      const [tag] = await tx.insert(tags).values({ ownerId, name: validation.name }).returning({ id: tags.id, name: tags.name });
      return { ok: true, tag };
    });
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-da-tag-repetido" };
    throw error;
  }
}

// Renomear vale para todos os Stoods marcados; nunca junta duas Tags
export async function updateTagName(ownerId: string, tagId: string, name: string): Promise<UpdateTagNameResult> {
  if (!isUuid(tagId)) return { ok: false, reason: "tag-nao-encontrada" };
  const validation = validateTagName(name);
  if (!validation.ok) return validation;

  try {
    const updated = await db
      .update(tags)
      .set({ name: validation.name })
      .where(and(eq(tags.id, tagId), eq(tags.ownerId, ownerId)))
      .returning({ id: tags.id });
    return updated.length > 0 ? { ok: true } : { ok: false, reason: "tag-nao-encontrada" };
  } catch (error) {
    if (isConstraintViolation(error, NAME_UNIQUE_CONSTRAINT)) return { ok: false, reason: "nome-da-tag-repetido" };
    throw error;
  }
}

// As ligações somem em cascata; os Stoods ficam
export async function deleteTag(ownerId: string, tagId: string): Promise<DeleteTagResult> {
  if (!isUuid(tagId)) return { ok: false, reason: "tag-nao-encontrada" };
  const deleted = await db
    .delete(tags)
    .where(and(eq(tags.id, tagId), eq(tags.ownerId, ownerId)))
    .returning({ id: tags.id });
  return deleted.length > 0 ? { ok: true } : { ok: false, reason: "tag-nao-encontrada" };
}

// Troca os Stoods marcados por uma Tag pela lista escolhida em "Gerenciar Tags".
// Stood de outro dono ou id inválido ficam de fora; Stood que passaria de 10 Tags recusa a lista inteira.
export async function updateTagStoods(ownerId: string, tagId: string, stoodIds: string[]): Promise<UpdateTagStoodsResult> {
  if (!isUuid(tagId)) return { ok: false, reason: "tag-nao-encontrada" };
  const requestedIds = [...new Set(stoodIds.filter(isUuid))];

  return db.transaction(async (tx): Promise<UpdateTagStoodsResult> => {
    await lockOwnerTags(tx, ownerId);
    const [tag] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.ownerId, ownerId)))
      .limit(1);
    if (!tag) return { ok: false, reason: "tag-nao-encontrada" };

    const ownedStoodIds =
      requestedIds.length > 0
        ? (
            await tx
              .select({ id: stoods.id })
              .from(stoods)
              .where(and(eq(stoods.ownerId, ownerId), inArray(stoods.id, requestedIds)))
          ).map((stood) => stood.id)
        : [];
    const markedIds = new Set(
      (await tx.select({ stoodId: stoodTags.stoodId }).from(stoodTags).where(eq(stoodTags.tagId, tagId))).map((row) => row.stoodId),
    );
    const addedIds = ownedStoodIds.filter((stoodId) => !markedIds.has(stoodId));
    if (await hasFullStood(tx, ownerId, addedIds)) return { ok: false, reason: "limite-de-tags-do-stood" };

    await tx.delete(stoodTags).where(and(eq(stoodTags.tagId, tagId), eq(stoodTags.ownerId, ownerId)));
    if (ownedStoodIds.length > 0) {
      await tx.insert(stoodTags).values(ownedStoodIds.map((stoodId) => ({ ownerId, stoodId, tagId })));
    }
    return { ok: true };
  });
}

// Troca as Tags do Stood pela lista final, dentro da transação de quem grava o Stood.
// Ids que não existem mais (Tag apagada em outra aba) ficam de fora; nome novo igual a uma Tag existente usa a existente.
export async function updateStoodTags(
  tx: Transaction,
  ownerId: string,
  stoodId: string,
  input: StoodTagsInput,
): Promise<UpdateStoodTagsResult> {
  const newNames: string[] = [];
  for (const name of input.newTagNames) {
    const validation = validateTagName(name);
    if (!validation.ok) return validation;
    if (!newNames.some((existing) => isSameTagName(existing, validation.name))) newNames.push(validation.name);
  }

  await lockOwnerTags(tx, ownerId);
  const ownedTags = await tx.select({ id: tags.id, name: tags.name }).from(tags).where(eq(tags.ownerId, ownerId));
  const requestedIds = new Set(input.tagIds.filter(isUuid));
  const chosen = new Map(ownedTags.filter((tag) => requestedIds.has(tag.id)).map((tag) => [tag.id, tag]));
  const namesToCreate: string[] = [];
  for (const name of newNames) {
    const existing = ownedTags.find((tag) => isSameTagName(tag.name, name));
    if (existing) chosen.set(existing.id, existing);
    else namesToCreate.push(name);
  }

  if (ownedTags.length + namesToCreate.length > MAX_TAGS_PER_USER) return { ok: false, reason: "limite-de-tags" };
  if (chosen.size + namesToCreate.length > MAX_TAGS_PER_STOOD) return { ok: false, reason: "limite-de-tags-do-stood" };

  const created =
    namesToCreate.length > 0
      ? await tx
          .insert(tags)
          .values(namesToCreate.map((name) => ({ ownerId, name })))
          .returning({ id: tags.id, name: tags.name })
      : [];
  const finalTags = [...chosen.values(), ...created];

  await tx.delete(stoodTags).where(and(eq(stoodTags.stoodId, stoodId), eq(stoodTags.ownerId, ownerId)));
  if (finalTags.length > 0) {
    await tx.insert(stoodTags).values(finalTags.map((tag) => ({ ownerId, stoodId, tagId: tag.id })));
  }
  return { ok: true, tags: buildSortedTags(finalTags) };
}

// Tags de cada Stood da lista, em ordem alfabética, numa consulta só
export async function getTagsByStoodId(ownerId: string, stoodIds: string[]): Promise<Map<string, StoodTag[]>> {
  if (stoodIds.length === 0) return new Map();
  const rows = await db
    .select({ stoodId: stoodTags.stoodId, id: tags.id, name: tags.name })
    .from(stoodTags)
    .innerJoin(tags, eq(tags.id, stoodTags.tagId))
    .where(and(eq(stoodTags.ownerId, ownerId), inArray(stoodTags.stoodId, stoodIds)));
  const grouped = Map.groupBy(rows, (row) => row.stoodId);
  return new Map(
    [...grouped].map(([stoodId, stoodRows]) => [stoodId, buildSortedTags(stoodRows.map(({ id, name }) => ({ id, name })))]),
  );
}

// Serializa as escritas de Tag do mesmo Usuário, para duas abas não passarem juntas do limite
async function lockOwnerTags(tx: Transaction, ownerId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`tags:${ownerId}`}, 0))`);
}

// Algum dos Stoods que vão ganhar a Tag já está no limite de Tags?
async function hasFullStood(tx: Transaction, ownerId: string, stoodIds: string[]) {
  if (stoodIds.length === 0) return false;
  const counts = await tx
    .select({ stoodId: stoodTags.stoodId, total: count() })
    .from(stoodTags)
    .where(and(eq(stoodTags.ownerId, ownerId), inArray(stoodTags.stoodId, stoodIds)))
    .groupBy(stoodTags.stoodId);
  return counts.some((row) => row.total >= MAX_TAGS_PER_STOOD);
}

async function countOwnerTags(tx: Transaction, ownerId: string) {
  const [row] = await tx.select({ total: count() }).from(tags).where(eq(tags.ownerId, ownerId));
  return row.total;
}
