import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { appointmentChanges, appointments, focuses, stoods, users } from "@/db/schema";
import {
  type AppointmentInput,
  createAppointment,
  deleteAppointment,
  getAgendaMonth,
  getUpcomingAppointments,
  updateAppointment,
} from "@/lib/agenda/agenda";
import { MAX_APPOINTMENTS_PER_USER } from "@/lib/agenda/rules";
import { requireOwnerLock } from "@/lib/lock";
import { createStood, createUser, trackWriteOrder } from "@/test/db";

// Segunda-feira, 23/11/2026, 10h em Brasília (UTC-3)
const NOW = new Date("2026-11-23T13:00:00.000Z");
const MS_PER_MINUTE = 60_000;

const APPOINTMENT: AppointmentInput = {
  title: "Prova de Cálculo",
  day: "2026-11-25",
  timeOfDay: "10:00",
  stoodId: null,
  recurrence: "none",
  weekdays: [],
  endsOn: null,
};

// Simulado todo sábado a partir de 07/11
const SATURDAY_MOCK: AppointmentInput = { ...APPOINTMENT, title: "Simulado", day: "2026-11-07", timeOfDay: "09:00", recurrence: "weekly", weekdays: [6] };

async function createOwnedAppointment(ownerId: string, values: Partial<AppointmentInput> = {}) {
  const result = await createAppointment(ownerId, { ...APPOINTMENT, ...values });
  if (!result.ok) throw new Error(`não criou o Compromisso: ${result.reason}`);
  return result.id;
}

// Simulado de sábado com 28/11 mudado à mão e, depois, a série encurtada para antes dele
async function createShortenedSeries(ownerId: string) {
  const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);
  const change = { title: "Revisão", day: "2026-11-28", timeOfDay: null, stoodId: null };
  await updateAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-28" }, change);
  await updateAppointment(ownerId, id, { kind: "all" }, { ...SATURDAY_MOCK, endsOn: "2026-11-21" });
  return { id, change };
}

async function getChangeRows(appointmentId: string) {
  return db.select().from(appointmentChanges).where(eq(appointmentChanges.appointmentId, appointmentId));
}

async function insertFocus(ownerId: string, stoodId: string, startedAt: Date, durationMinutes = 25) {
  await db.insert(focuses).values({ ownerId, stoodId, startedAt, durationMinutes });
}

describe("createAppointment", () => {
  it("grava o Compromisso com o título aparado e o Stood do dono", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const id = await createOwnedAppointment(ownerId, { title: "  Prova  ", stoodId: stood.id });

    const [row] = await db.select().from(appointments).where(eq(appointments.id, id));
    expect(row).toMatchObject({ ownerId, title: "Prova", day: "2026-11-25", timeOfDay: "10:00:00", stoodId: stood.id, recurrence: "none" });
  });

  it("grava o Compromisso recorrente com os dias da semana e a data final", async () => {
    const ownerId = await createUser();

    const id = await createOwnedAppointment(ownerId, { ...SATURDAY_MOCK, endsOn: "2026-12-19" });

    const [row] = await db.select().from(appointments).where(eq(appointments.id, id));
    expect(row).toMatchObject({ recurrence: "weekly", weekdays: [6], endsOn: "2026-12-19" });
  });

  it("recusa o Stood de outro Usuário como inexistente", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(createAppointment(ownerId, { ...APPOINTMENT, stoodId: otherStood.id })).resolves.toEqual({
      ok: false,
      reason: "stood-nao-encontrado",
    });
  });

  it.each([
    ["título vazio", { title: " " }, "titulo-vazio"],
    ["data final antes do início", { recurrence: "daily" as const, endsOn: "2026-11-01" }, "data-final-antes-do-inicio"],
  ])("recusa %s", async (_case, values, reason) => {
    const ownerId = await createUser();

    await expect(createAppointment(ownerId, { ...APPOINTMENT, ...values })).resolves.toEqual({ ok: false, reason });
  });

  it("recusa o 501º Compromisso, inclusive com duas criações ao mesmo tempo", async () => {
    const ownerId = await createUser();
    await db
      .insert(appointments)
      .values(Array.from({ length: MAX_APPOINTMENTS_PER_USER - 1 }, (_, index) => ({ ownerId, title: `Compromisso ${index}`, day: "2026-11-25" })));

    const results = await Promise.all([createAppointment(ownerId, APPOINTMENT), createAppointment(ownerId, APPOINTMENT)]);

    expect(results.map((result) => result.ok).sort()).toEqual([false, true]);
    expect(results.find((result) => !result.ok)).toEqual({ ok: false, reason: "limite-de-compromissos" });
  });
});

describe("updateAppointment", () => {
  it("muda só uma Ocorrência e deixa as outras como estavam", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);

    const result = await updateAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-14" }, {
      title: "Simulado na sexta",
      day: "2026-11-13",
      timeOfDay: "",
      stoodId: null,
    });

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-13", NOW);
    expect(result).toEqual({ ok: true });
    expect(month.items.map((item) => [item.day, item.title])).toEqual([
      ["2026-11-07", "Simulado"],
      ["2026-11-13", "Simulado na sexta"],
      ["2026-11-21", "Simulado"],
      ["2026-11-28", "Simulado"],
      // A grade de novembro termina no sábado, 05/12
      ["2026-12-05", "Simulado"],
    ]);
  });

  it("recusa mudar uma Ocorrência num dia em que a repetição não cria nenhuma", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);

    await expect(
      updateAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-15" }, { title: "Simulado", day: "2026-11-15", timeOfDay: "", stoodId: null }),
    ).resolves.toEqual({ ok: false, reason: "ocorrencia-nao-encontrada" });
  });

  it("muda a série inteira e preserva as Ocorrências mudadas quando a repetição não muda", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);
    await deleteAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-14" });

    await updateAppointment(ownerId, id, { kind: "all" }, { ...SATURDAY_MOCK, title: "Simulado geral", timeOfDay: "08:00" });

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-07", NOW);
    expect(month.items.map((item) => [item.day, item.title, item.timeOfDay])).toEqual([
      ["2026-11-07", "Simulado geral", "08:00"],
      ["2026-11-21", "Simulado geral", "08:00"],
      ["2026-11-28", "Simulado geral", "08:00"],
      ["2026-12-05", "Simulado geral", "08:00"],
    ]);
  });

  it("leva para a Ocorrência mudada aberta no diálogo o que o Usuário mudou ao salvar em Todas", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);
    await updateAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-14" }, {
      title: "Revisão",
      day: "2026-11-14",
      timeOfDay: "08:00",
      stoodId: null,
    });

    // O diálogo abriu a Ocorrência de 14/11, trocou só o título e salvou em "Todas"
    const form = { title: "Revisão geral", day: "2026-11-14", timeOfDay: "08:00", stoodId: null };
    await updateAppointment(
      ownerId,
      id,
      { kind: "all", editedOccurrence: { originalDay: "2026-11-14", ...form } },
      { ...SATURDAY_MOCK, title: "Revisão geral" },
    );

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-07", NOW);
    expect(month.items.slice(0, 3).map((item) => [item.day, item.title, item.timeOfDay])).toEqual([
      ["2026-11-07", "Revisão geral", "09:00"],
      ["2026-11-14", "Revisão geral", "08:00"],
      ["2026-11-21", "Revisão geral", "09:00"],
    ]);
  });

  it("descarta as Ocorrências mudadas quando a repetição muda", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);
    await deleteAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-14" });

    await updateAppointment(ownerId, id, { kind: "all" }, { ...SATURDAY_MOCK, weekdays: [0, 6] });

    expect(await getChangeRows(id)).toEqual([]);
  });

  it("muda de novo a Ocorrência mudada que ficou depois da data final da série encurtada", async () => {
    const ownerId = await createUser();
    const { id, change } = await createShortenedSeries(ownerId);

    const result = await updateAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-28" }, { ...change, title: "Revisão geral" });

    expect(result).toEqual({ ok: true });
    expect(await getChangeRows(id)).toMatchObject([{ originalDay: "2026-11-28", title: "Revisão geral" }]);
  });

  it.each(["amanhã", "2026-02-30", ""])("recusa mudar a Ocorrência de um dia malformado: %j", async (originalDay) => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, { recurrence: "daily" });

    await expect(
      updateAppointment(ownerId, id, { kind: "one", originalDay }, { title: "Prova", day: "2026-11-28", timeOfDay: null, stoodId: null }),
    ).resolves.toEqual({ ok: false, reason: "ocorrencia-nao-encontrada" });
  });

  it("espera a gravação de Compromissos do mesmo Usuário que já começou", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId);

    const order = await trackWriteOrder(
      (tx) => requireOwnerLock(tx, ownerId, "appointments"),
      () => updateAppointment(ownerId, id, { kind: "all" }, { ...APPOINTMENT, title: "Prova final" }),
    );

    expect(order).toEqual(["primeira gravação", "segunda gravação"]);
  });

  it("trata o Compromisso de outro Usuário como inexistente e não o altera", async () => {
    const otherId = await createUser();
    const id = await createOwnedAppointment(otherId);
    const ownerId = await createUser();

    const result = await updateAppointment(ownerId, id, { kind: "all" }, { ...APPOINTMENT, title: "Invadido" });

    const [row] = await db.select({ title: appointments.title }).from(appointments).where(eq(appointments.id, id));
    expect([result, row.title]).toEqual([{ ok: false, reason: "compromisso-nao-encontrado" }, "Prova de Cálculo"]);
  });
});

describe("deleteAppointment", () => {
  it("apaga só uma Ocorrência", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);

    const result = await deleteAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-21" });

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-21", NOW);
    expect(result).toEqual({ ok: true });
    expect(month.items.map((item) => item.day)).toEqual(["2026-11-07", "2026-11-14", "2026-11-28", "2026-12-05"]);
  });

  it("apaga a série inteira junto com as Ocorrências mudadas", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);
    await deleteAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-21" });

    await deleteAppointment(ownerId, id, { kind: "all" });

    expect([await db.select().from(appointments).where(eq(appointments.id, id)), await getChangeRows(id)]).toEqual([[], []]);
  });

  it("apaga a Ocorrência mudada que ficou depois da data final da série encurtada", async () => {
    const ownerId = await createUser();
    const { id } = await createShortenedSeries(ownerId);

    const result = await deleteAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-28" });

    const agenda = await getAgendaMonth(ownerId, "2026-11", "2026-11-28", NOW);
    expect(result).toEqual({ ok: true });
    expect(agenda.items.map((item) => item.day)).toEqual(["2026-11-07", "2026-11-14", "2026-11-21"]);
  });

  it("espera a gravação de Compromissos do mesmo Usuário que já começou", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId);

    const order = await trackWriteOrder(
      (tx) => requireOwnerLock(tx, ownerId, "appointments"),
      () => deleteAppointment(ownerId, id, { kind: "all" }),
    );

    expect(order).toEqual(["primeira gravação", "segunda gravação"]);
  });

  it("não apaga o Compromisso de outro Usuário", async () => {
    const otherId = await createUser();
    const id = await createOwnedAppointment(otherId);
    const ownerId = await createUser();

    await expect(deleteAppointment(ownerId, id, { kind: "all" })).resolves.toEqual({ ok: false, reason: "compromisso-nao-encontrado" });
  });
});

describe("getAgendaMonth", () => {
  it("soma o Tempo estudado de cada dia no horário de Brasília, contando o Foco no dia em que começou", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    // Domingo, 22/11, às 23h50 em Brasília, que já é segunda em UTC
    await insertFocus(ownerId, stood.id, new Date("2026-11-23T02:50:00.000Z"));
    // Segunda, 23/11, às 8h em Brasília
    await insertFocus(ownerId, stood.id, new Date("2026-11-23T11:00:00.000Z"), 50);

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-23", NOW);

    expect([month.studiedSecondsByDay["2026-11-22"], month.studiedSecondsByDay["2026-11-23"]]).toEqual([25 * 60, 50 * 60]);
  });

  it("deixa o Foco em andamento fora do Tempo estudado do dia", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await insertFocus(ownerId, stood.id, new Date(NOW.getTime() - 10 * MS_PER_MINUTE));

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-23", NOW);

    expect(month.studiedSecondsByDay["2026-11-23"]).toBeUndefined();
  });

  it("mostra o Tempo estudado por Stood no dia escolhido, do maior para o menor", async () => {
    const ownerId = await createUser();
    const calculus = await createStood(ownerId, "Cálculo I");
    const physics = await createStood(ownerId, "Física II");
    await insertFocus(ownerId, physics.id, new Date("2026-11-20T12:00:00.000Z"));
    await insertFocus(ownerId, calculus.id, new Date("2026-11-20T13:00:00.000Z"), 50);

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-20", NOW);

    expect(month.selectedDayStoods).toEqual([
      { id: calculus.id, name: "Cálculo I", studiedSeconds: 50 * 60 },
      { id: physics.id, name: "Física II", studiedSeconds: 25 * 60 },
    ]);
  });

  it("traz os Compromissos com o nome do Stood e os dias vizinhos que aparecem na grade", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createOwnedAppointment(ownerId, { stoodId: stood.id });
    // 05/12 aparece na última semana da grade de novembro
    await createOwnedAppointment(ownerId, { title: "Entrega", day: "2026-12-05", timeOfDay: "" });

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-23", NOW);

    expect(month.items.map((item) => [item.day, item.title, item.stoodName])).toEqual([
      ["2026-11-25", "Prova de Cálculo", "Cálculo I"],
      ["2026-12-05", "Entrega", null],
    ]);
  });

  it("não mostra Focos nem Compromissos de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    await insertFocus(otherId, otherStood.id, new Date("2026-11-20T12:00:00.000Z"));
    await createOwnedAppointment(otherId);
    const ownerId = await createUser();

    const month = await getAgendaMonth(ownerId, "2026-11", "2026-11-20", NOW);

    expect([month.items, month.studiedSecondsByDay, month.selectedDayStoods]).toEqual([[], {}, []]);
  });
});

describe("getUpcomingAppointments", () => {
  it("devolve até 3 dos próximos 14 dias, com o recorrente uma vez só e o nome do Stood", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createOwnedAppointment(ownerId, { stoodId: stood.id });
    await createOwnedAppointment(ownerId, SATURDAY_MOCK);
    await createOwnedAppointment(ownerId, { title: "Entrega", day: "2026-12-02" });
    await createOwnedAppointment(ownerId, { title: "Seminário", day: "2026-12-04" });

    const upcoming = await getUpcomingAppointments(ownerId, NOW);

    expect(upcoming.map((item) => [item.day, item.title, item.stoodName])).toEqual([
      ["2026-11-25", "Prova de Cálculo", "Cálculo I"],
      ["2026-11-28", "Simulado", null],
      ["2026-12-02", "Entrega", null],
    ]);
  });

  it("não devolve Compromissos de outro Usuário", async () => {
    const otherId = await createUser();
    await createOwnedAppointment(otherId);
    const ownerId = await createUser();

    await expect(getUpcomingAppointments(ownerId, NOW)).resolves.toEqual([]);
  });
});

describe("tabelas da Agenda", () => {
  it("apaga Compromissos e Ocorrências mudadas junto com o Usuário", async () => {
    const ownerId = await createUser();
    const id = await createOwnedAppointment(ownerId, SATURDAY_MOCK);
    await deleteAppointment(ownerId, id, { kind: "one", originalDay: "2026-11-14" });

    await db.delete(users).where(eq(users.id, ownerId));

    expect([await db.select().from(appointments).where(eq(appointments.ownerId, ownerId)), await getChangeRows(id)]).toEqual([[], []]);
  });

  it("mantém o Compromisso, sem Stood, quando a linha do Stood é apagada", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const id = await createOwnedAppointment(ownerId, { stoodId: stood.id });

    await db.delete(stoods).where(eq(stoods.id, stood.id));

    await expect(db.select({ stoodId: appointments.stoodId }).from(appointments).where(eq(appointments.id, id))).resolves.toEqual([{ stoodId: null }]);
  });

  it("recusa no banco o Compromisso ligado ao Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(db.insert(appointments).values({ ownerId, title: "Prova", day: "2026-11-25", stoodId: otherStood.id })).rejects.toThrow();
  });

  it("recusa no banco o semanal sem dias da semana", async () => {
    const ownerId = await createUser();

    await expect(db.insert(appointments).values({ ownerId, title: "Simulado", day: "2026-11-07", recurrence: "weekly" })).rejects.toThrow();
  });
});
