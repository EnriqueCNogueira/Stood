"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  type ActiveFocus,
  type CreateFocusResult,
  type InterruptFocusResult,
  type UpsertWeeklyGoalResult,
  createFocus,
  deleteWeeklyGoal,
  findActiveFocus,
  interruptFocus,
  upsertWeeklyGoal,
} from "@/lib/pomodoro/pomodoro";

// Os limites de duração e de meta ficam no Service; aqui só se confere o formato da entrada
const createFocusInputSchema = z.object({ stoodId: z.string(), durationMinutes: z.number() });
const weeklyGoalInputSchema = z.object({ minutes: z.number() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type CreateFocusActionResult = CreateFocusResult | InvalidInput;
export type UpsertWeeklyGoalActionResult = UpsertWeeklyGoalResult | InvalidInput;

const LIBRARY_PATH = "/biblioteca";

// O dono vem da sessão; a Biblioteca é revalidada porque mostra o Foco em andamento e o Tempo estudado
export async function createFocusAction(input: unknown): Promise<CreateFocusActionResult> {
  const user = await requireSession();
  const parsed = createFocusInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createFocus(user.id, parsed.data.stoodId, parsed.data.durationMinutes);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}

export async function interruptFocusAction(): Promise<InterruptFocusResult> {
  const user = await requireSession();
  const result = await interruptFocus(user.id);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}

// Releitura do Foco em andamento quando a aba volta a ficar visível, para mostrar o que outra aba ou aparelho iniciou
export async function findActiveFocusAction(): Promise<ActiveFocus | null> {
  const user = await requireSession();
  return (await findActiveFocus(user.id)) ?? null;
}

export async function upsertWeeklyGoalAction(input: unknown): Promise<UpsertWeeklyGoalActionResult> {
  const user = await requireSession();
  const parsed = weeklyGoalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await upsertWeeklyGoal(user.id, parsed.data.minutes);
  if (result.ok) revalidatePath(LIBRARY_PATH);
  return result;
}

export async function deleteWeeklyGoalAction(): Promise<void> {
  const user = await requireSession();
  await deleteWeeklyGoal(user.id);
  revalidatePath(LIBRARY_PATH);
}
