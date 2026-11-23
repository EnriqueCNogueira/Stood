"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { type CreateStoodResult, type UpdateStoodResult, createStood, updateStood } from "@/lib/stood/stood";

// Teto só para barrar entrada abusiva; o limite de Tags por Stood fica no Service
const MAX_TAG_ITEMS = 50;

// As regras de nome, descrição e Tags ficam no Service; aqui só se confere o formato da entrada
const tagsInputSchema = z.object({
  tagIds: z.array(z.string()).max(MAX_TAG_ITEMS),
  newTagNames: z.array(z.string()).max(MAX_TAG_ITEMS),
});
const detailsInputSchema = z.object({ name: z.string(), description: z.string(), tags: tagsInputSchema.optional() });
const updateInputSchema = detailsInputSchema.extend({ stoodId: z.string() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type CreateStoodActionResult = CreateStoodResult | InvalidInput;
export type UpdateStoodActionResult = UpdateStoodResult | InvalidInput;

// Cria o Stood do Usuário da sessão e atualiza a Biblioteca, que passa a listá-lo; devolve o id para quem chamou
export async function createStoodAction(input: unknown): Promise<CreateStoodActionResult> {
  const user = await requireSession();
  const parsed = detailsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createStood(user.id, parsed.data);
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}

// Sem revalidar a página: o Quadro troca o nome e as Tags na tela, e uma nova renderização gravaria last_opened_at
export async function updateStoodAction(input: unknown): Promise<UpdateStoodActionResult> {
  const user = await requireSession();
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const { stoodId, ...details } = parsed.data;
  return updateStood(user.id, stoodId, details);
}
