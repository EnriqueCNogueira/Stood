import "server-only";

import { type SQL, and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointmentChanges, appointments, focuses, stoods } from "@/db/schema";
import {
  AGENDA_TIME_ZONE,
  type AgendaItem,
  type AppointmentInputReason,
  type AppointmentRule,
  MAX_APPOINTMENTS_PER_USER,
  type OccurrenceChange,
  type Recurrence,
  buildAgendaItems,
  buildMonthGrid,
  buildOccurrenceDays,
  buildShiftedDay,
  buildTodayInBrasilia,
  buildUpcomingItems,
  isSameRecurrence,
  isValidDay,
  validateAppointmentInput,
  validateOccurrenceInput,
} from "@/lib/agenda/rules";
import { requireOwnerLock } from "@/lib/lock";
import {
  type StoodStudiedTime,
  buildEndedFocusCondition,
  buildFocusStudiedSecondsSum,
  buildStudiedStoods,
} from "@/lib/pomodoro/pomodoro";
import { buildSortedByName } from "@/lib/stood/tree";
import { isUuid } from "@/lib/uuid";

// Regra do Compromisso, para o diálogo editar a série inteira a partir de uma Ocorrência
export type AppointmentSeries = Omit<AppointmentRule, "id">;

export type AgendaEntry = AgendaItem & { stoodName: string | null; series: AppointmentSeries };

export type AgendaMonth = {
  month: string;
  weeks: string[][];
  studiedSecondsByDay: Record<string, number>;
  items: AgendaEntry[];
  selectedDay: string;
  selectedDayStoods: StoodStudiedTime[];
  stoods: { id: string; name: string }[];
};

export type AppointmentInput = {
  title: string;
  day: string;
  timeOfDay: string | null;
  stoodId: string | null;
  recurrence: Recurrence;
  weekdays: number[];
  endsOn: string | null;
};

// "Só esta": o que muda numa Ocorrência
export type OccurrenceUpdate = { title: string; day: string; timeOfDay: string | null; stoodId: string | null };

export type AppointmentScope = { kind: "all" } | { kind: "one"; originalDay: string };

export type CreateAppointmentResult =
  | { ok: true; id: string }
  | { ok: false; reason: AppointmentInputReason | "stood-nao-encontrado" | "limite-de-compromissos" };
export type UpdateAppointmentResult =
  | { ok: true }
  | {
      ok: false;
      reason: AppointmentInputReason | "stood-nao-encontrado" | "compromisso-nao-encontrado" | "ocorrencia-nao-encontrada";
    };
export type DeleteAppointmentResult = { ok: true } | { ok: false; reason: "compromisso-nao-encontrado" | "ocorrencia-nao-encontrada" };

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const RULE_COLUMNS = {
  id: appointments.id,
  title: appointments.title,
  day: appointments.day,
  timeOfDay: appointments.timeOfDay,
  stoodId: appointments.stoodId,
  recurrence: appointments.recurrence,
  weekdays: appointments.weekdays,
  endsOn: appointments.endsOn,
};

// O fuso entra como texto fixo, e não como parâmetro, para o agrupamento repetir exatamente a mesma expressão
const TIME_ZONE_SQL = sql.raw(`'${AGENDA_TIME_ZONE}'`);
const focusLocalDay = sql<string>`to_char(${focuses.startedAt} at time zone ${TIME_ZONE_SQL}, 'YYYY-MM-DD')`;

// Grade do mês com o Tempo estudado de cada dia, os Compromissos e Ocorrências e o detalhe do dia escolhido
export async function getAgendaMonth(ownerId: string, month: string, selectedDay: string, now = new Date()): Promise<AgendaMonth> {
  const weeks = buildMonthGrid(month);
  const from = weeks[0][0];
  const to = weeks[weeks.length - 1][6];

  const [studiedRows, selectedRows, { rules, changes }, ownedStoods] = await Promise.all([
    getStudiedRowsByDay(ownerId, from, to, now),
    getStudiedRowsByStood(ownerId, selectedDay, now),
    getRulesAndChanges(ownerId),
    db.select({ id: stoods.id, name: stoods.name }).from(stoods).where(eq(stoods.ownerId, ownerId)),
  ]);

  const stoodNames = new Map(ownedStoods.map((stood) => [stood.id, stood.name]));
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const items = buildAgendaItems(rules, changes, from, to).map((item) =>
    buildEntry(item, rulesById.get(item.appointmentId) as AppointmentRule, stoodNames),
  );

  return {
    month,
    weeks,
    studiedSecondsByDay: Object.fromEntries(studiedRows.map((row) => [row.day, row.studiedSeconds])),
    items,
    selectedDay,
    selectedDayStoods: buildStudiedStoods(selectedRows),
    stoods: buildSortedByName(ownedStoods),
  };
}

// Até 500 por Usuário; a trava por Usuário faz duas abas que criam juntas no limite criarem um só
export async function createAppointment(ownerId: string, input: AppointmentInput): Promise<CreateAppointmentResult> {
  const validation = validateAppointmentInput(input);
  if (!validation.ok) return validation;

  return db.transaction(async (tx): Promise<CreateAppointmentResult> => {
    await requireOwnerLock(tx, ownerId, "appointments");
    if (input.stoodId !== null && !(await isOwnedStood(tx, ownerId, input.stoodId))) return { ok: false, reason: "stood-nao-encontrado" };
    const [{ total }] = await tx.select({ total: count() }).from(appointments).where(eq(appointments.ownerId, ownerId));
    if (total >= MAX_APPOINTMENTS_PER_USER) return { ok: false, reason: "limite-de-compromissos" };

    const [row] = await tx
      .insert(appointments)
      .values({ ownerId, ...validation.input, stoodId: input.stoodId })
      .returning({ id: appointments.id });
    return { ok: true, id: row.id };
  });
}

// "Todas" muda a série; mudar a repetição (tipo, dias ou início) descarta as Ocorrências mudadas à mão.
// "Só esta" grava a mudança de uma Ocorrência que a repetição cria.
export async function updateAppointment(
  ownerId: string,
  appointmentId: string,
  scope: { kind: "all" },
  input: AppointmentInput,
): Promise<UpdateAppointmentResult>;
export async function updateAppointment(
  ownerId: string,
  appointmentId: string,
  scope: { kind: "one"; originalDay: string },
  input: OccurrenceUpdate,
): Promise<UpdateAppointmentResult>;
export async function updateAppointment(
  ownerId: string,
  appointmentId: string,
  scope: AppointmentScope,
  input: AppointmentInput | OccurrenceUpdate,
): Promise<UpdateAppointmentResult> {
  if (!isUuid(appointmentId)) return { ok: false, reason: "compromisso-nao-encontrado" };

  return db.transaction(async (tx): Promise<UpdateAppointmentResult> => {
    await requireOwnerLock(tx, ownerId, "appointments");
    const rule = await findOwnedRule(tx, ownerId, appointmentId);
    if (!rule) return { ok: false, reason: "compromisso-nao-encontrado" };
    if (input.stoodId !== null && !(await isOwnedStood(tx, ownerId, input.stoodId))) return { ok: false, reason: "stood-nao-encontrado" };

    if (scope.kind === "all") return updateSeries(tx, ownerId, rule, input as AppointmentInput);

    const validation = validateOccurrenceInput(input);
    if (!validation.ok) return validation;
    if (!(await hasOccurrence(tx, ownerId, rule, scope.originalDay))) return { ok: false, reason: "ocorrencia-nao-encontrada" };

    const values = { ...validation.input, stoodId: input.stoodId, isDeleted: false };
    await tx
      .insert(appointmentChanges)
      .values({ ownerId, appointmentId, originalDay: scope.originalDay, ...values })
      .onConflictDoUpdate({ target: [appointmentChanges.appointmentId, appointmentChanges.originalDay], set: values });
    return { ok: true };
  });
}

// "Todas" apaga a série e, em cascata, as Ocorrências mudadas; "Só esta" marca a Ocorrência como apagada
export async function deleteAppointment(ownerId: string, appointmentId: string, scope: AppointmentScope): Promise<DeleteAppointmentResult> {
  if (!isUuid(appointmentId)) return { ok: false, reason: "compromisso-nao-encontrado" };

  return db.transaction(async (tx): Promise<DeleteAppointmentResult> => {
    await requireOwnerLock(tx, ownerId, "appointments");
    const rule = await findOwnedRule(tx, ownerId, appointmentId);
    if (!rule) return { ok: false, reason: "compromisso-nao-encontrado" };

    if (scope.kind === "all") {
      await tx.delete(appointments).where(and(eq(appointments.id, appointmentId), eq(appointments.ownerId, ownerId)));
      return { ok: true };
    }

    if (!(await hasOccurrence(tx, ownerId, rule, scope.originalDay))) return { ok: false, reason: "ocorrencia-nao-encontrada" };
    const deleted = { isDeleted: true, title: null, day: null, timeOfDay: null, stoodId: null };
    await tx
      .insert(appointmentChanges)
      .values({ ownerId, appointmentId, originalDay: scope.originalDay, ...deleted })
      .onConflictDoUpdate({ target: [appointmentChanges.appointmentId, appointmentChanges.originalDay], set: deleted });
    return { ok: true };
  });
}

// Lembrete da Biblioteca: até 3 dos próximos 14 dias, contando hoje inteiro no horário de Brasília
export async function getUpcomingAppointments(ownerId: string, now = new Date()): Promise<AgendaEntry[]> {
  const [{ rules, changes }, ownedStoods] = await Promise.all([
    getRulesAndChanges(ownerId),
    db.select({ id: stoods.id, name: stoods.name }).from(stoods).where(eq(stoods.ownerId, ownerId)),
  ]);
  const stoodNames = new Map(ownedStoods.map((stood) => [stood.id, stood.name]));
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  return buildUpcomingItems(rules, changes, buildTodayInBrasilia(now)).map((item) =>
    buildEntry(item, rulesById.get(item.appointmentId) as AppointmentRule, stoodNames),
  );
}

async function updateSeries(
  tx: Transaction,
  ownerId: string,
  rule: AppointmentRule,
  input: AppointmentInput,
): Promise<UpdateAppointmentResult> {
  const validation = validateAppointmentInput(input);
  if (!validation.ok) return validation;
  const next = validation.input;

  await tx
    .update(appointments)
    .set({ ...next, stoodId: input.stoodId })
    .where(and(eq(appointments.id, rule.id), eq(appointments.ownerId, ownerId)));
  if (next.day !== rule.day || !isSameRecurrence(next, rule)) {
    await tx
      .delete(appointmentChanges)
      .where(and(eq(appointmentChanges.appointmentId, rule.id), eq(appointmentChanges.ownerId, ownerId)));
  }
  return { ok: true };
}

// Todos os Compromissos e Ocorrências mudadas do dono: no máximo 500 Compromissos, então as Ocorrências
// são calculadas na memória, o que vale também para a repetição sem fim
async function getRulesAndChanges(ownerId: string): Promise<{ rules: AppointmentRule[]; changes: OccurrenceChange[] }> {
  const [ruleRows, changeRows] = await Promise.all([
    db.select(RULE_COLUMNS).from(appointments).where(eq(appointments.ownerId, ownerId)),
    db
      .select({
        appointmentId: appointmentChanges.appointmentId,
        originalDay: appointmentChanges.originalDay,
        isDeleted: appointmentChanges.isDeleted,
        title: appointmentChanges.title,
        day: appointmentChanges.day,
        timeOfDay: appointmentChanges.timeOfDay,
        stoodId: appointmentChanges.stoodId,
      })
      .from(appointmentChanges)
      .where(eq(appointmentChanges.ownerId, ownerId)),
  ]);
  return {
    rules: ruleRows.map((row) => ({ ...row, timeOfDay: buildShortTime(row.timeOfDay) })),
    changes: changeRows.map((row) => ({ ...row, timeOfDay: buildShortTime(row.timeOfDay) })),
  };
}

async function findOwnedRule(tx: Transaction, ownerId: string, appointmentId: string): Promise<AppointmentRule | undefined> {
  const [row] = await tx
    .select(RULE_COLUMNS)
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.ownerId, ownerId)))
    .limit(1);
  return row && { ...row, timeOfDay: buildShortTime(row.timeOfDay) };
}

async function isOwnedStood(tx: Transaction, ownerId: string, stoodId: string) {
  if (!isUuid(stoodId)) return false;
  const [stood] = await tx
    .select({ id: stoods.id })
    .from(stoods)
    .where(and(eq(stoods.id, stoodId), eq(stoods.ownerId, ownerId)))
    .limit(1);
  return stood !== undefined;
}

// Só o Compromisso recorrente tem Ocorrências: nos dias que a própria repetição cria e nos que já foram mudados à mão,
// que continuam na Agenda mesmo quando a série é encurtada para antes deles
async function hasOccurrence(tx: Transaction, ownerId: string, rule: AppointmentRule, originalDay: string) {
  if (rule.recurrence === "none" || !isValidDay(originalDay)) return false;
  if (buildOccurrenceDays(rule, originalDay, originalDay).length === 1) return true;

  const [change] = await tx
    .select({ isDeleted: appointmentChanges.isDeleted })
    .from(appointmentChanges)
    .where(
      and(
        eq(appointmentChanges.appointmentId, rule.id),
        eq(appointmentChanges.originalDay, originalDay),
        eq(appointmentChanges.ownerId, ownerId),
      ),
    )
    .limit(1);
  return change !== undefined && !change.isDeleted;
}

function getStudiedRowsByDay(ownerId: string, from: string, to: string, now: Date) {
  return db
    .select({ day: focusLocalDay, studiedSeconds: buildFocusStudiedSecondsSum() })
    .from(focuses)
    .where(and(eq(focuses.ownerId, ownerId), buildStartedBetween(from, to), buildEndedFocusCondition(now)))
    .groupBy(focusLocalDay);
}

function getStudiedRowsByStood(ownerId: string, day: string, now: Date) {
  return db
    .select({ id: focuses.stoodId, name: stoods.name, studiedSeconds: buildFocusStudiedSecondsSum() })
    .from(focuses)
    .leftJoin(stoods, and(eq(stoods.id, focuses.stoodId), eq(stoods.ownerId, focuses.ownerId)))
    .where(and(eq(focuses.ownerId, ownerId), buildStartedBetween(day, day), buildEndedFocusCondition(now)))
    .groupBy(focuses.stoodId, stoods.name);
}

// Focos que começaram entre o início de from e o fim de to, no horário de Brasília
function buildStartedBetween(from: string, to: string): SQL | undefined {
  return and(
    sql`${focuses.startedAt} >= (${from}::date)::timestamp at time zone ${TIME_ZONE_SQL}`,
    sql`${focuses.startedAt} < (${buildShiftedDay(to, 1)}::date)::timestamp at time zone ${TIME_ZONE_SQL}`,
  );
}

function buildEntry(item: AgendaItem, rule: AppointmentRule, stoodNames: Map<string, string>): AgendaEntry {
  const { id: _id, ...series } = rule;
  return { ...item, stoodName: item.stoodId ? (stoodNames.get(item.stoodId) ?? null) : null, series };
}

// O Postgres devolve "10:00:00"; a Agenda usa "10:00"
function buildShortTime(timeOfDay: string | null) {
  return timeOfDay === null ? null : timeOfDay.slice(0, 5);
}
