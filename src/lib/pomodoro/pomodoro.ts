import "server-only";

import { type SQL, and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { focuses, stoods, weeklyGoals } from "@/db/schema";
import {
  MIN_COUNTED_FOCUS_SECONDS,
  WEEK_TIME_ZONE,
  isValidFocusMinutes,
  isValidWeeklyGoalMinutes,
} from "@/lib/pomodoro/limits";
import { isUuid } from "@/lib/uuid";

export type ActiveFocus = { stoodId: string | null; stoodName: string | null; endsAt: Date };

export type StoodStudiedTime = { id: string; name: string; studiedSeconds: number };

export type WeekSummary = {
  studiedSeconds: number;
  stoods: StoodStudiedTime[];
  weeklyGoalMinutes: number | null;
  activeFocus: ActiveFocus | undefined;
};

export type CreateFocusResult =
  | { ok: true; focus: ActiveFocus }
  | { ok: false; reason: "duracao-invalida" | "stood-nao-encontrado" | "foco-em-andamento" };
export type InterruptFocusResult = { ok: true; isCounted: boolean } | { ok: false; reason: "sem-foco-em-andamento" };
export type UpsertWeeklyGoalResult = { ok: true } | { ok: false; reason: "meta-invalida" };

const MS_PER_MINUTE = 60_000;
const NAME_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

// Fim previsto: o Foco sem interrupção termina aqui, mesmo sem nenhuma tela aberta
const focusEnd = sql`(${focuses.startedAt} + ${focuses.durationMinutes} * interval '1 minute')`;

// Inicia o Foco no Stood do dono. A trava por Usuário faz duas abas que iniciam juntas criarem um Foco só.
export async function createFocus(
  ownerId: string,
  stoodId: string,
  durationMinutes: number,
  now = new Date(),
): Promise<CreateFocusResult> {
  if (!isValidFocusMinutes(durationMinutes)) return { ok: false, reason: "duracao-invalida" };
  if (!isUuid(stoodId)) return { ok: false, reason: "stood-nao-encontrado" };

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))`);

    const [stood] = await tx
      .select({ name: stoods.name })
      .from(stoods)
      .where(and(eq(stoods.id, stoodId), eq(stoods.ownerId, ownerId)))
      .limit(1);
    if (!stood) return { ok: false, reason: "stood-nao-encontrado" };

    const [active] = await tx
      .select({ id: focuses.id })
      .from(focuses)
      .where(buildActiveCondition(ownerId, now))
      .limit(1);
    if (active) return { ok: false, reason: "foco-em-andamento" };

    await tx.insert(focuses).values({ ownerId, stoodId, startedAt: now, durationMinutes });
    return {
      ok: true,
      focus: { stoodId, stoodName: stood.name, endsAt: new Date(now.getTime() + durationMinutes * MS_PER_MINUTE) },
    };
  });
}

// Encerra o Foco em andamento; com menos do mínimo, ele é apagado e não conta como Tempo estudado
export async function interruptFocus(ownerId: string, now = new Date()): Promise<InterruptFocusResult> {
  return db.transaction(async (tx) => {
    const [active] = await tx
      .select({ id: focuses.id, startedAt: focuses.startedAt })
      .from(focuses)
      .where(buildActiveCondition(ownerId, now))
      .limit(1)
      .for("update");
    if (!active) return { ok: false, reason: "sem-foco-em-andamento" };

    const elapsedSeconds = (now.getTime() - active.startedAt.getTime()) / 1000;
    if (elapsedSeconds < MIN_COUNTED_FOCUS_SECONDS) {
      await tx.delete(focuses).where(eq(focuses.id, active.id));
      return { ok: true, isCounted: false };
    }

    await tx.update(focuses).set({ interruptedAt: now }).where(eq(focuses.id, active.id));
    return { ok: true, isCounted: true };
  });
}

export async function findActiveFocus(ownerId: string, now = new Date()): Promise<ActiveFocus | undefined> {
  const [active] = await db
    .select({ stoodId: focuses.stoodId, stoodName: stoods.name, endsAt: sql<Date>`${focusEnd}`.mapWith(focuses.startedAt) })
    .from(focuses)
    .leftJoin(stoods, and(eq(stoods.id, focuses.stoodId), eq(stoods.ownerId, focuses.ownerId)))
    .where(buildActiveCondition(ownerId, now))
    .limit(1);
  return active;
}

// Tempo estudado da semana de segunda a domingo em Brasília, só com Focos encerrados.
// O Foco conta inteiro na semana em que começou; o Foco em andamento vem à parte.
export async function getWeekSummary(ownerId: string, now = new Date()): Promise<WeekSummary> {
  const [stoodRows, [goal], activeFocus] = await Promise.all([
    getWeekStoodRows(ownerId, now),
    db.select({ minutes: weeklyGoals.minutes }).from(weeklyGoals).where(eq(weeklyGoals.ownerId, ownerId)).limit(1),
    findActiveFocus(ownerId, now),
  ]);

  const studiedSeconds = stoodRows.reduce((total, row) => total + row.studiedSeconds, 0);
  // Focos de Stood apagado entram no total, mas ainda não têm nome para aparecer na lista
  const studiedStoods = stoodRows
    .filter((row): row is StoodStudiedTime => row.id !== null && row.name !== null)
    .sort((a, b) => b.studiedSeconds - a.studiedSeconds || NAME_COLLATOR.compare(a.name, b.name));

  return { studiedSeconds, stoods: studiedStoods, weeklyGoalMinutes: goal?.minutes ?? null, activeFocus };
}

export async function upsertWeeklyGoal(ownerId: string, minutes: number): Promise<UpsertWeeklyGoalResult> {
  if (!isValidWeeklyGoalMinutes(minutes)) return { ok: false, reason: "meta-invalida" };

  await db
    .insert(weeklyGoals)
    .values({ ownerId, minutes })
    .onConflictDoUpdate({ target: weeklyGoals.ownerId, set: { minutes } });
  return { ok: true };
}

export async function deleteWeeklyGoal(ownerId: string): Promise<void> {
  await db.delete(weeklyGoals).where(eq(weeklyGoals.ownerId, ownerId));
}

function getWeekStoodRows(ownerId: string, now: Date) {
  const weekStart = sql`(date_trunc('week', ${now}::timestamptz at time zone ${WEEK_TIME_ZONE}) at time zone ${WEEK_TIME_ZONE})`;
  const isInWeek = and(
    sql`${focuses.startedAt} >= ${weekStart}`,
    sql`${focuses.startedAt} < ${weekStart} + interval '7 days'`,
  );
  const isEnded = or(sql`${focuses.interruptedAt} is not null`, lte(focusEnd, now));
  // A CHECK garante que a interrupção vem antes do fim previsto, então ela é o fim real quando existe
  const studiedSeconds = sql<number>`floor(sum(extract(epoch from coalesce(${focuses.interruptedAt}, ${focusEnd}) - ${focuses.startedAt})))::int`;

  return db
    .select({ id: focuses.stoodId, name: stoods.name, studiedSeconds })
    .from(focuses)
    .leftJoin(stoods, and(eq(stoods.id, focuses.stoodId), eq(stoods.ownerId, focuses.ownerId)))
    .where(and(eq(focuses.ownerId, ownerId), isInWeek, isEnded))
    .groupBy(focuses.stoodId, stoods.name);
}

// Em andamento: não foi interrompido e o fim previsto ainda não chegou
function buildActiveCondition(ownerId: string, now: Date): SQL | undefined {
  return and(eq(focuses.ownerId, ownerId), isNull(focuses.interruptedAt), gt(focusEnd, now));
}
