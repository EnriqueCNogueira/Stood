"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  type CreateTagResult,
  type DeleteTagResult,
  type UpdateTagNameResult,
  type UpdateTagStoodsResult,
  createTag,
  deleteTag,
  updateTagName,
  updateTagStoods,
} from "@/lib/tag/tag";

// Teto só para barrar entrada abusiva; o Service confere quais Stoods são do dono
const MAX_STOOD_ITEMS = 1000;

// As regras do nome e dos limites ficam no Service; aqui só se confere o formato da entrada
const createInputSchema = z.object({ name: z.string() });
const updateInputSchema = z.object({ tagId: z.string(), name: z.string() });
const deleteInputSchema = z.object({ tagId: z.string() });
const stoodsInputSchema = z.object({ tagId: z.string(), stoodIds: z.array(z.string()).max(MAX_STOOD_ITEMS) });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type CreateTagActionResult = CreateTagResult | InvalidInput;
export type UpdateTagNameActionResult = UpdateTagNameResult | InvalidInput;
export type DeleteTagActionResult = DeleteTagResult | InvalidInput;
export type UpdateTagStoodsActionResult = UpdateTagStoodsResult | InvalidInput;

const LIBRARY_PATH = "/biblioteca";

// O dono vem da sessão; a Biblioteca é revalidada porque mostra as Tags no filtro, nos cartões e em "Gerenciar Tags"
export async function createTagAction(input: unknown): Promise<CreateTagActionResult> {
  const user = await requireSession();
  const parsed = createInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createTag(user.id, parsed.data.name);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}

export async function updateTagNameAction(input: unknown): Promise<UpdateTagNameActionResult> {
  const user = await requireSession();
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await updateTagName(user.id, parsed.data.tagId, parsed.data.name);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}

export async function deleteTagAction(input: unknown): Promise<DeleteTagActionResult> {
  const user = await requireSession();
  const parsed = deleteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await deleteTag(user.id, parsed.data.tagId);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}

// Marca a Tag nos Stoods escolhidos em "Gerenciar Tags" e tira dos outros
export async function updateTagStoodsAction(input: unknown): Promise<UpdateTagStoodsActionResult> {
  const user = await requireSession();
  const parsed = stoodsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await updateTagStoods(user.id, parsed.data.tagId, parsed.data.stoodIds);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}
