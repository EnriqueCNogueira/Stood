"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  type CreateAppointmentResult,
  type DeleteAppointmentResult,
  type UpdateAppointmentResult,
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from "@/lib/agenda/agenda";
import { RECURRENCES } from "@/lib/agenda/rules";
import { requireSession } from "@/lib/auth/session";

// As regras de título, dia, repetição e limite ficam no Service; aqui só se confere o formato da entrada
const occurrenceSchema = z.object({
  title: z.string(),
  day: z.string(),
  timeOfDay: z.string().nullable(),
  stoodId: z.string().nullable(),
});
const appointmentSchema = occurrenceSchema.extend({
  recurrence: z.enum(RECURRENCES),
  weekdays: z.array(z.number()).max(7),
  endsOn: z.string().nullable(),
});
const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("one"), originalDay: z.string() }),
]);
const updateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("all"),
    appointmentId: z.string(),
    input: appointmentSchema,
    editedOccurrence: occurrenceSchema.extend({ originalDay: z.string() }).optional(),
  }),
  z.object({ kind: z.literal("one"), appointmentId: z.string(), originalDay: z.string(), input: occurrenceSchema }),
]);
const deleteSchema = z.object({ appointmentId: z.string(), scope: scopeSchema });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type CreateAppointmentActionResult = CreateAppointmentResult | InvalidInput;
export type UpdateAppointmentActionResult = UpdateAppointmentResult | InvalidInput;
export type DeleteAppointmentActionResult = DeleteAppointmentResult | InvalidInput;

// O dono vem da sessão; a Agenda e os Próximos compromissos da Biblioteca mostram o resultado
export async function createAppointmentAction(input: unknown): Promise<CreateAppointmentActionResult> {
  const user = await requireSession();
  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createAppointment(user.id, parsed.data);
  if (result.ok) revalidateAgenda();
  return result;
}

export async function updateAppointmentAction(input: unknown): Promise<UpdateAppointmentActionResult> {
  const user = await requireSession();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const data = parsed.data;
  const result =
    data.kind === "all"
      ? await updateAppointment(user.id, data.appointmentId, { kind: "all", editedOccurrence: data.editedOccurrence }, data.input)
      : await updateAppointment(user.id, data.appointmentId, { kind: "one", originalDay: data.originalDay }, data.input);
  if (result.ok) revalidateAgenda();
  return result;
}

export async function deleteAppointmentAction(input: unknown): Promise<DeleteAppointmentActionResult> {
  const user = await requireSession();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await deleteAppointment(user.id, parsed.data.appointmentId, parsed.data.scope);
  if (result.ok) revalidateAgenda();
  return result;
}

function revalidateAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/biblioteca");
}
