"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { type CreateStoodResult, createStood } from "@/lib/stood/stood";

// As regras de nome e descrição ficam no Service; aqui só se confere o formato da entrada
const detailsInputSchema = z.object({ name: z.string(), description: z.string() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type CreateStoodActionResult = CreateStoodResult | InvalidInput;

// Cria o Stood do Usuário da sessão e atualiza a Biblioteca, que passa a listá-lo; devolve o id para quem chamou
export async function createStoodAction(input: unknown): Promise<CreateStoodActionResult> {
  const user = await requireSession();
  const parsed = detailsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createStood(user.id, parsed.data);
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}
