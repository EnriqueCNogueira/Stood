import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { focuses, stoods, users, weeklyGoals } from "@/db/schema";
import {
  createFocus,
  deleteWeeklyGoal,
  findActiveFocus,
  getWeekSummary,
  interruptFocus,
  upsertWeeklyGoal,
} from "@/lib/pomodoro/pomodoro";
import { createStood, createUser } from "@/test/db";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
// Segunda-feira, 23/11/2026, 10h em Brasília (UTC-3)
const MONDAY_10AM = new Date("2026-11-23T13:00:00.000Z");

function minutesBefore(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * MS_PER_MINUTE);
}

async function insertFocus(
  ownerId: string,
  stoodId: string | null,
  values: { startedAt: Date; durationMinutes?: number; interruptedAt?: Date },
) {
  const [focus] = await db
    .insert(focuses)
    .values({ ownerId, stoodId, durationMinutes: 25, ...values })
    .returning({ id: focuses.id });
  return focus.id;
}

async function getFocusRows(ownerId: string) {
  return db.select().from(focuses).where(eq(focuses.ownerId, ownerId));
}

describe("createFocus", () => {
  it("inicia o Foco no Stood do dono, com fim previsto pela duração", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();

    const result = await createFocus(ownerId, stood.id, 25, now);

    expect(result).toEqual({
      ok: true,
      focus: { stoodId: stood.id, stoodName: "Cálculo I", endsAt: new Date(now.getTime() + 25 * MS_PER_MINUTE) },
    });
  });

  it("aceita um Foco novo depois que o anterior terminou sem ser interrompido", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(now, 30), durationMinutes: 25 });

    await expect(createFocus(ownerId, stood.id, 25, now)).resolves.toMatchObject({ ok: true });
  });

  it("recusa com outro Foco em andamento, mesmo em outro Stood", async () => {
    const ownerId = await createUser();
    const calculus = await createStood(ownerId, "Cálculo I");
    const physics = await createStood(ownerId, "Física II");
    const now = new Date();
    await insertFocus(ownerId, calculus.id, { startedAt: minutesBefore(now, 10) });

    await expect(createFocus(ownerId, physics.id, 25, now)).resolves.toEqual({ ok: false, reason: "foco-em-andamento" });
  });

  it("cria um Foco só quando duas abas iniciam ao mesmo tempo", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();

    const results = await Promise.all([createFocus(ownerId, stood.id, 25, now), createFocus(ownerId, stood.id, 25, now)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await getFocusRows(ownerId)).toHaveLength(1);
  });

  it("trata o Stood de outro Usuário como inexistente", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(createFocus(ownerId, otherStood.id, 25)).resolves.toEqual({ ok: false, reason: "stood-nao-encontrado" });
  });

  it("recusa id que não é uuid como Stood inexistente", async () => {
    const ownerId = await createUser();

    await expect(createFocus(ownerId, "nao-e-uuid", 25)).resolves.toEqual({ ok: false, reason: "stood-nao-encontrado" });
  });

  it.each([4, 121, 2.5])("recusa a duração de %s minutos", async (minutes) => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createFocus(ownerId, stood.id, minutes)).resolves.toEqual({ ok: false, reason: "duracao-invalida" });
  });
});

describe("interruptFocus", () => {
  it("grava a interrupção do Foco em andamento", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(now, 10) });

    const result = await interruptFocus(ownerId, now);

    expect(result).toEqual({ ok: true, isCounted: true });
    expect(await getFocusRows(ownerId)).toMatchObject([{ interruptedAt: now }]);
  });

  it("descarta o Foco interrompido com menos de 1 minuto", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    await insertFocus(ownerId, stood.id, { startedAt: new Date(now.getTime() - 30_000) });

    const result = await interruptFocus(ownerId, now);

    expect(result).toEqual({ ok: true, isCounted: false });
    expect(await getFocusRows(ownerId)).toEqual([]);
  });

  it("devolve falha sem Foco em andamento, inclusive depois do fim previsto", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(now, 30), durationMinutes: 25 });

    await expect(interruptFocus(ownerId, now)).resolves.toEqual({ ok: false, reason: "sem-foco-em-andamento" });
  });

  it("não interrompe o Foco de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const now = new Date();
    await insertFocus(otherId, otherStood.id, { startedAt: minutesBefore(now, 10) });
    const ownerId = await createUser();

    await interruptFocus(ownerId, now);

    expect(await getFocusRows(otherId)).toMatchObject([{ interruptedAt: null }]);
  });
});

describe("findActiveFocus", () => {
  it("devolve o Foco dentro da duração, com o nome do Stood e o fim previsto", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    const startedAt = minutesBefore(now, 10);
    await insertFocus(ownerId, stood.id, { startedAt, durationMinutes: 25 });

    await expect(findActiveFocus(ownerId, now)).resolves.toEqual({
      stoodId: stood.id,
      stoodName: "Cálculo I",
      endsAt: new Date(startedAt.getTime() + 25 * MS_PER_MINUTE),
    });
  });

  it("deixa de devolver o Foco depois do fim previsto", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(now, 25), durationMinutes: 25 });

    await expect(findActiveFocus(ownerId, now)).resolves.toBeUndefined();
  });

  it("não devolve o Foco interrompido", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date();
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(now, 10), interruptedAt: minutesBefore(now, 5) });

    await expect(findActiveFocus(ownerId, now)).resolves.toBeUndefined();
  });

  it("não devolve o Foco de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const now = new Date();
    await insertFocus(otherId, otherStood.id, { startedAt: minutesBefore(now, 10) });
    const ownerId = await createUser();

    await expect(findActiveFocus(ownerId, now)).resolves.toBeUndefined();
  });
});

describe("getWeekSummary", () => {
  it("soma os Focos encerrados da semana, no total e por Stood, do maior para o menor", async () => {
    const ownerId = await createUser();
    const calculus = await createStood(ownerId, "Cálculo I");
    const physics = await createStood(ownerId, "Física II");
    // Interrompido depois de 20 minutos
    await insertFocus(ownerId, physics.id, {
      startedAt: minutesBefore(MONDAY_10AM, 120),
      interruptedAt: minutesBefore(MONDAY_10AM, 100),
    });
    // Dois Focos inteiros de 25 minutos
    await insertFocus(ownerId, calculus.id, { startedAt: minutesBefore(MONDAY_10AM, 90) });
    await insertFocus(ownerId, calculus.id, { startedAt: minutesBefore(MONDAY_10AM, 60) });

    const summary = await getWeekSummary(ownerId, MONDAY_10AM);

    expect(summary).toMatchObject({
      studiedSeconds: 70 * 60,
      stoods: [
        { id: calculus.id, name: "Cálculo I", studiedSeconds: 50 * 60 },
        { id: physics.id, name: "Física II", studiedSeconds: 20 * 60 },
      ],
    });
  });

  it("conta inteiro o Foco esquecido, que terminou sem ser interrompido", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const now = new Date(MONDAY_10AM.getTime() + 2 * MS_PER_DAY);
    await insertFocus(ownerId, stood.id, { startedAt: MONDAY_10AM, durationMinutes: 120 });

    await expect(getWeekSummary(ownerId, now)).resolves.toMatchObject({ studiedSeconds: 120 * 60 });
  });

  it("deixa o Foco em andamento fora da soma e o devolve à parte", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(MONDAY_10AM, 10) });

    const summary = await getWeekSummary(ownerId, MONDAY_10AM);

    expect(summary).toMatchObject({ studiedSeconds: 0, stoods: [], activeFocus: { stoodName: "Cálculo I" } });
  });

  it("deixa fora da semana nova o Foco que começou no domingo e terminou na segunda", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    // Domingo às 23h50 em Brasília, terminando segunda à 0h15
    await insertFocus(ownerId, stood.id, { startedAt: new Date("2026-11-23T02:50:00.000Z") });
    const mondayAfterMidnight = new Date("2026-11-23T03:20:00.000Z");

    await expect(getWeekSummary(ownerId, mondayAfterMidnight)).resolves.toMatchObject({ studiedSeconds: 0 });
  });

  it("vira a semana à meia-noite de Brasília, e não à de UTC", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    // Domingo às 22h em Brasília, que já é segunda-feira em UTC
    await insertFocus(ownerId, stood.id, { startedAt: new Date("2026-11-23T01:00:00.000Z") });
    // Segunda à 0h05 em Brasília
    await insertFocus(ownerId, stood.id, { startedAt: new Date("2026-11-23T03:05:00.000Z") });

    await expect(getWeekSummary(ownerId, MONDAY_10AM)).resolves.toMatchObject({ studiedSeconds: 25 * 60 });
  });

  it("devolve a Meta semanal, ou nulo sem meta", async () => {
    const ownerId = await createUser();
    const withoutGoal = await getWeekSummary(ownerId, MONDAY_10AM);
    await upsertWeeklyGoal(ownerId, 600);

    expect([withoutGoal.weeklyGoalMinutes, (await getWeekSummary(ownerId, MONDAY_10AM)).weeklyGoalMinutes]).toEqual([
      null,
      600,
    ]);
  });

  it("não soma os Focos de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    await insertFocus(otherId, otherStood.id, { startedAt: minutesBefore(MONDAY_10AM, 60) });
    const ownerId = await createUser();

    await expect(getWeekSummary(ownerId, MONDAY_10AM)).resolves.toMatchObject({ studiedSeconds: 0, stoods: [] });
  });

  it("mantém o Foco no total quando a linha do Stood é apagada", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(MONDAY_10AM, 60) });

    await db.delete(stoods).where(eq(stoods.id, stood.id));

    expect(await getFocusRows(ownerId)).toMatchObject([{ ownerId, stoodId: null }]);
    await expect(getWeekSummary(ownerId, MONDAY_10AM)).resolves.toMatchObject({ studiedSeconds: 25 * 60, stoods: [] });
  });
});

describe("upsertWeeklyGoal", () => {
  it("define e depois muda a Meta semanal", async () => {
    const ownerId = await createUser();

    await upsertWeeklyGoal(ownerId, 600);
    const result = await upsertWeeklyGoal(ownerId, 450);

    expect(result).toEqual({ ok: true });
    expect(await db.select({ minutes: weeklyGoals.minutes }).from(weeklyGoals).where(eq(weeklyGoals.ownerId, ownerId))).toEqual([
      { minutes: 450 },
    ]);
  });

  it.each([30, 4800])("aceita o limite de %s minutos", async (minutes) => {
    const ownerId = await createUser();

    await expect(upsertWeeklyGoal(ownerId, minutes)).resolves.toEqual({ ok: true });
  });

  it.each([0, 15, 45, 4830, 90.5])("recusa a meta de %s minutos", async (minutes) => {
    const ownerId = await createUser();

    await expect(upsertWeeklyGoal(ownerId, minutes)).resolves.toEqual({ ok: false, reason: "meta-invalida" });
  });
});

describe("deleteWeeklyGoal", () => {
  it("remove a Meta semanal só do dono", async () => {
    const otherId = await createUser();
    await upsertWeeklyGoal(otherId, 600);
    const ownerId = await createUser();
    await upsertWeeklyGoal(ownerId, 600);

    await deleteWeeklyGoal(ownerId);

    const goals = await db.select({ ownerId: weeklyGoals.ownerId }).from(weeklyGoals);
    expect(goals.filter((goal) => goal.ownerId === ownerId || goal.ownerId === otherId)).toEqual([{ ownerId: otherId }]);
  });
});

describe("tabelas do Pomodoro", () => {
  it("apaga Focos e Meta semanal junto com o Usuário", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await insertFocus(ownerId, stood.id, { startedAt: minutesBefore(new Date(), 60) });
    await upsertWeeklyGoal(ownerId, 600);

    await db.delete(users).where(eq(users.id, ownerId));

    expect([
      await getFocusRows(ownerId),
      await db.select().from(weeklyGoals).where(eq(weeklyGoals.ownerId, ownerId)),
    ]).toEqual([[], []]);
  });

  it("recusa no banco um Foco ligado ao Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(insertFocus(ownerId, otherStood.id, { startedAt: new Date() })).rejects.toThrow();
  });

  it.each([
    ["duração abaixo de 5 minutos", { durationMinutes: 4 }],
    ["duração acima de 120 minutos", { durationMinutes: 121 }],
    ["interrupção antes de 1 minuto", { interruptedAt: new Date("2026-11-23T13:00:30.000Z") }],
    ["interrupção depois do fim previsto", { interruptedAt: new Date("2026-11-23T13:25:00.000Z") }],
  ])("recusa no banco o Foco com %s", async (_case, values) => {
    const ownerId = await createUser();

    await expect(insertFocus(ownerId, null, { startedAt: MONDAY_10AM, ...values })).rejects.toThrow();
  });

  it("recusa no banco a meta fora dos passos de 30 minutos", async () => {
    const ownerId = await createUser();

    await expect(db.insert(weeklyGoals).values({ ownerId, minutes: 45 })).rejects.toThrow();
  });
});
