"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { type UpdateBoardWindowsResult, updateBoardWindows } from "@/lib/board/layout";

// O formato das Janelas é conferido no Service; aqui só se confere a forma da entrada
const updateWindowsInputSchema = z.object({ stoodId: z.string(), windows: z.unknown() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type UpdateBoardWindowsActionResult = UpdateBoardWindowsResult | InvalidInput;

// Chamada pelo salvamento automático do Quadro; sem revalidar, porque a página já mostra as Janelas
export async function updateBoardWindowsAction(input: unknown): Promise<UpdateBoardWindowsActionResult> {
  const user = await requireSession();
  const parsed = updateWindowsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  return updateBoardWindows(user.id, parsed.data);
}
