import { describe, expect, it } from "vitest";
import {
  type AppointmentRule,
  type OccurrenceChange,
  buildAgendaDayPath,
  buildAgendaItems,
  buildDayTitle,
  buildMonthGrid,
  buildMonthTitle,
  buildOccurrenceDays,
  buildRelativeDayLabel,
  buildSeriesInput,
  buildShiftedDay,
  buildShiftedMonth,
  buildSortedDayItems,
  buildTodayInBrasilia,
  buildUpcomingItems,
  isSameRecurrence,
  isValidDay,
  isValidMonth,
  validateAppointmentInput,
  validateOccurrenceEdit,
  validateOccurrenceInput,
} from "@/lib/agenda/rules";

function buildRule(values: Partial<AppointmentRule> = {}): AppointmentRule {
  return {
    id: "simulado",
    title: "Simulado",
    day: "2026-11-07",
    timeOfDay: null,
    stoodId: null,
    recurrence: "none",
    weekdays: [],
    endsOn: null,
    ...values,
  };
}

function buildChange(values: Partial<OccurrenceChange>): OccurrenceChange {
  return {
    appointmentId: "simulado",
    originalDay: "2026-11-14",
    isDeleted: false,
    title: null,
    day: null,
    timeOfDay: null,
    stoodId: null,
    ...values,
  };
}

const VALID_INPUT = {
  title: "Prova de Cálculo",
  day: "2026-11-20",
  timeOfDay: "10:00",
  recurrence: "none" as const,
  weekdays: [],
  endsOn: null,
};

describe("buildOccurrenceDays", () => {
  it("devolve só o dia do Compromisso que não se repete", () => {
    expect(buildOccurrenceDays(buildRule(), "2026-11-01", "2026-11-30")).toEqual(["2026-11-07"]);
  });

  it("repete todo dia a partir do início", () => {
    const rule = buildRule({ recurrence: "daily", day: "2026-11-28" });

    expect(buildOccurrenceDays(rule, "2026-11-25", "2026-12-02")).toEqual([
      "2026-11-28",
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
  });

  it("repete toda semana no dia escolhido, como o simulado de sábado", () => {
    const rule = buildRule({ recurrence: "weekly", weekdays: [6] });

    expect(buildOccurrenceDays(rule, "2026-11-01", "2026-11-30")).toEqual(["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"]);
  });

  it("repete toda semana em vários dias da semana", () => {
    const rule = buildRule({ recurrence: "weekly", weekdays: [2, 4], day: "2026-11-03" });

    expect(buildOccurrenceDays(rule, "2026-11-01", "2026-11-14")).toEqual(["2026-11-03", "2026-11-05", "2026-11-10", "2026-11-12"]);
  });

  it("repete todo mês no mesmo número de dia", () => {
    const rule = buildRule({ recurrence: "monthly", day: "2026-11-15" });

    expect(buildOccurrenceDays(rule, "2026-11-01", "2027-01-31")).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });

  it.each([
    ["fevereiro de ano comum", "2027-02-01", "2027-02-28", "2027-02-28"],
    ["fevereiro de ano bissexto", "2028-02-01", "2028-02-29", "2028-02-29"],
    ["abril", "2027-04-01", "2027-04-30", "2027-04-30"],
    ["junho", "2027-06-01", "2027-06-30", "2027-06-30"],
  ])("põe o mensal do dia 31 no último dia de %s", (_case, from, to, expected) => {
    const rule = buildRule({ recurrence: "monthly", day: "2027-01-31" });

    expect(buildOccurrenceDays(rule, from, to)).toEqual([expected]);
  });

  it("para na data final", () => {
    const rule = buildRule({ recurrence: "weekly", weekdays: [6], endsOn: "2026-11-21" });

    expect(buildOccurrenceDays(rule, "2026-11-01", "2026-12-31")).toEqual(["2026-11-07", "2026-11-14", "2026-11-21"]);
  });

  it("repete sem fim dentro do intervalo pedido quando não há data final", () => {
    const rule = buildRule({ recurrence: "weekly", weekdays: [6] });

    expect(buildOccurrenceDays(rule, "2030-01-01", "2030-01-12")).toEqual(["2030-01-05", "2030-01-12"]);
  });

  it("não cria Ocorrência antes do dia de início", () => {
    const rule = buildRule({ recurrence: "daily", day: "2026-11-20" });

    expect(buildOccurrenceDays(rule, "2026-11-01", "2026-11-19")).toEqual([]);
  });
});

describe("buildAgendaItems", () => {
  const weeklyRule = buildRule({ recurrence: "weekly", weekdays: [6] });

  it("tira a Ocorrência apagada e mantém as outras", () => {
    const items = buildAgendaItems([weeklyRule], [buildChange({ isDeleted: true })], "2026-11-01", "2026-11-30");

    expect(items.map((item) => item.day)).toEqual(["2026-11-07", "2026-11-21", "2026-11-28"]);
  });

  it("mostra a Ocorrência mudada no novo dia, com os novos dados", () => {
    const change = buildChange({ title: "Simulado extra", day: "2026-11-13", timeOfDay: "08:00" });

    const items = buildAgendaItems([weeklyRule], [change], "2026-11-01", "2026-11-30");

    expect(items.find((item) => item.originalDay === "2026-11-14")).toMatchObject({
      day: "2026-11-13",
      title: "Simulado extra",
      timeOfDay: "08:00",
      isRecurring: true,
    });
    expect(items.some((item) => item.day === "2026-11-14")).toBe(false);
  });

  it("mostra a Ocorrência movida para depois da data final", () => {
    const rule = buildRule({ recurrence: "weekly", weekdays: [6], endsOn: "2026-12-12" });
    const change = buildChange({ originalDay: "2026-12-12", title: "Simulado", day: "2026-12-16" });

    const items = buildAgendaItems([rule], [change], "2026-12-01", "2026-12-31");

    expect(items.map((item) => item.day)).toEqual(["2026-12-05", "2026-12-16"]);
  });

  it("marca o Compromisso recorrente com mudanças à mão", () => {
    const items = buildAgendaItems([weeklyRule, buildRule({ id: "prova", day: "2026-11-10" })], [buildChange({ isDeleted: true })], "2026-11-01", "2026-11-12");

    expect(items.map((item) => [item.appointmentId, item.hasChanges])).toEqual([
      ["simulado", true],
      ["prova", false],
    ]);
  });
});

describe("buildSortedDayItems", () => {
  it("põe o dia inteiro antes dos horários, os horários em ordem e o empate por título", () => {
    const sorted = buildSortedDayItems([
      { title: "Monitoria", timeOfDay: "14:00" },
      { title: "Entrega", timeOfDay: null },
      { title: "Prova", timeOfDay: "08:00" },
      { title: "Aula extra", timeOfDay: "14:00" },
    ]);

    expect(sorted.map((item) => item.title)).toEqual(["Entrega", "Prova", "Aula extra", "Monitoria"]);
  });
});

describe("buildUpcomingItems", () => {
  const today = "2026-11-23";

  it("devolve até 3 Compromissos dos próximos 14 dias, do mais próximo ao mais distante", () => {
    const rules = [
      buildRule({ id: "a", title: "Prova", day: "2026-11-25" }),
      buildRule({ id: "b", title: "Entrega", day: "2026-11-24" }),
      buildRule({ id: "c", title: "Seminário", day: "2026-12-01" }),
      buildRule({ id: "d", title: "Lista", day: "2026-11-30" }),
      buildRule({ id: "e", title: "Fora do prazo", day: "2026-12-07" }),
    ];

    expect(buildUpcomingItems(rules, [], today).map((item) => item.title)).toEqual(["Entrega", "Prova", "Lista"]);
  });

  it("mantém o Compromisso de hoje mesmo depois do horário", () => {
    const rules = [buildRule({ day: today, timeOfDay: "08:00" })];

    expect(buildUpcomingItems(rules, [], today)).toHaveLength(1);
  });

  it("mostra o Compromisso recorrente só pela próxima Ocorrência", () => {
    const rules = [buildRule({ recurrence: "weekly", weekdays: [6] }), buildRule({ id: "prova", title: "Prova", day: "2026-12-02" })];

    expect(buildUpcomingItems(rules, [], today).map((item) => [item.title, item.day])).toEqual([
      ["Simulado", "2026-11-28"],
      ["Prova", "2026-12-02"],
    ]);
  });

  it("não mostra o que já passou nem o que fica depois de 14 dias", () => {
    const rules = [buildRule({ day: "2026-11-22" }), buildRule({ id: "longe", day: "2026-12-07" })];

    expect(buildUpcomingItems(rules, [], today)).toEqual([]);
  });
});

describe("buildRelativeDayLabel", () => {
  it.each([
    ["2026-11-23", "hoje"],
    ["2026-11-24", "amanhã"],
    ["2026-11-27", "em 4 dias"],
  ])("mostra %s como %s", (day, label) => {
    expect(buildRelativeDayLabel(day, "2026-11-23")).toBe(label);
  });
});

describe("buildAgendaDayPath", () => {
  it("leva ao dia na Agenda, já no mês dele", () => {
    expect(buildAgendaDayPath("2026-12-01")).toBe("/agenda?mes=2026-12&dia=2026-12-01");
  });
});

describe("buildTodayInBrasilia", () => {
  it("usa o dia de Brasília, que ainda é domingo quando já é segunda em UTC", () => {
    expect(buildTodayInBrasilia(new Date("2026-11-23T02:00:00.000Z"))).toBe("2026-11-22");
  });
});

describe("buildMonthGrid", () => {
  it("monta as semanas do mês começando no domingo, com os dias dos meses vizinhos nas pontas", () => {
    const grid = buildMonthGrid("2026-11");

    expect([grid.length, grid[0][0], grid[0][6], grid.at(-1)?.at(-1)]).toEqual([5, "2026-11-01", "2026-11-07", "2026-12-05"]);
  });

  it("começa no domingo anterior quando o mês não começa no domingo", () => {
    expect(buildMonthGrid("2026-12")[0][0]).toBe("2026-11-29");
  });
});

describe("buildShiftedMonth e buildShiftedDay", () => {
  it("passa da virada do ano", () => {
    expect([buildShiftedMonth("2026-12", 1), buildShiftedMonth("2026-01", -1), buildShiftedDay("2026-12-31", 1)]).toEqual(["2027-01", "2025-12", "2027-01-01"]);
  });
});

describe("buildMonthTitle e buildDayTitle", () => {
  it("escrevem o mês e o dia por extenso, sem mudar de dia por causa do fuso", () => {
    expect([buildMonthTitle("2026-11"), buildDayTitle("2026-11-23"), buildDayTitle("2026-11-01")]).toEqual([
      "novembro de 2026",
      "segunda-feira, 23 de novembro",
      "domingo, 1 de novembro",
    ]);
  });
});

describe("validateAppointmentInput", () => {
  it("apara o título e guarda o Compromisso que não se repete sem dias da semana nem data final", () => {
    const result = validateAppointmentInput({ ...VALID_INPUT, title: "  Prova  ", weekdays: [1], endsOn: "2026-12-01" });

    expect(result).toEqual({ ok: true, input: { ...VALID_INPUT, title: "Prova", weekdays: [], endsOn: null } });
  });

  it("aceita o semanal com dias da semana e sem horário", () => {
    const result = validateAppointmentInput({ ...VALID_INPUT, timeOfDay: "", recurrence: "weekly", weekdays: [6, 3, 6] });

    expect(result).toMatchObject({ ok: true, input: { timeOfDay: null, weekdays: [3, 6] } });
  });

  it.each([
    ["título vazio", { title: "   " }, "titulo-vazio"],
    ["título longo", { title: "a".repeat(101) }, "titulo-longo"],
    ["dia inexistente", { day: "2026-02-30" }, "dia-invalido"],
    ["horário inválido", { timeOfDay: "25:00" }, "horario-invalido"],
    ["semanal sem dias", { recurrence: "weekly" as const, weekdays: [] }, "dias-da-semana-invalidos"],
    ["dia da semana fora de 0 a 6", { recurrence: "weekly" as const, weekdays: [7] }, "dias-da-semana-invalidos"],
    ["data final antes do início", { recurrence: "daily" as const, endsOn: "2026-11-19" }, "data-final-antes-do-inicio"],
  ])("recusa %s", (_case, values, reason) => {
    expect(validateAppointmentInput({ ...VALID_INPUT, ...values })).toEqual({ ok: false, reason });
  });
});

describe("isValidDay e isValidMonth", () => {
  it.each(["1900-01-01", "2199-12-31"])("aceita o dia %s, no limite dos anos da Agenda", (day) => {
    expect(isValidDay(day) && isValidMonth(day.slice(0, 7))).toBe(true);
  });

  it.each(["1899-12-31", "2200-01-01", "9999-12-31"])("recusa o dia %s, fora dos anos da Agenda", (day) => {
    expect(isValidDay(day) || isValidMonth(day.slice(0, 7))).toBe(false);
  });
});

describe("isSameRecurrence", () => {
  it("ignora os dias da semana quando a repetição não é semanal", () => {
    expect(isSameRecurrence({ recurrence: "daily", weekdays: [] }, { recurrence: "daily", weekdays: [1] })).toBe(true);
  });

  it.each([
    ["tipo", { recurrence: "monthly" as const, weekdays: [6] }],
    ["dias da semana", { recurrence: "weekly" as const, weekdays: [0, 6] }],
  ])("percebe a mudança de %s", (_case, changed) => {
    expect(isSameRecurrence({ recurrence: "weekly", weekdays: [6] }, changed)).toBe(false);
  });
});

describe("validateOccurrenceEdit", () => {
  const input = { ...VALID_INPUT, recurrence: "weekly" as const, weekdays: [6], endsOn: "2026-11-30" };

  it("aceita a Ocorrência movida para depois da data final da série", () => {
    expect(validateOccurrenceEdit({ ...input, day: "2026-12-02" }, "2026-11-07")).toMatchObject({ ok: true });
  });

  it("recusa a data final antes do início da série", () => {
    expect(validateOccurrenceEdit({ ...input, endsOn: "2026-11-01" }, "2026-11-07")).toEqual({
      ok: false,
      reason: "data-final-antes-do-inicio",
    });
  });

  it("recusa o dia inválido da Ocorrência", () => {
    expect(validateOccurrenceEdit({ ...input, day: "" }, "2026-11-07")).toEqual({ ok: false, reason: "dia-invalido" });
  });
});

describe("buildSeriesInput", () => {
  const series = { title: "Simulado", day: "2026-11-07", timeOfDay: "09:00", stoodId: "calculo", recurrence: "weekly" as const, weekdays: [6], endsOn: null };
  const occurrence = { title: "Revisão", day: "2026-11-28", timeOfDay: null, stoodId: null };
  const form = { ...series, ...occurrence };

  it("mantém da série o que não mudou no formulário de uma Ocorrência mudada", () => {
    expect(buildSeriesInput({ ...form, endsOn: "2026-12-19" }, occurrence, series)).toEqual({ ...series, endsOn: "2026-12-19" });
  });

  it("leva para a série o título, o horário e o Stood que mudaram", () => {
    const changed = { title: "Simulado geral", timeOfDay: "08:00", stoodId: "fisica" };

    expect(buildSeriesInput({ ...form, ...changed }, occurrence, series)).toEqual({ ...series, ...changed });
  });
});

describe("validateOccurrenceInput", () => {
  it("apara o título e aceita sem horário", () => {
    expect(validateOccurrenceInput({ title: " Simulado ", day: "2026-11-13", timeOfDay: "" })).toEqual({
      ok: true,
      input: { title: "Simulado", day: "2026-11-13", timeOfDay: null },
    });
  });

  it("recusa dia inválido", () => {
    expect(validateOccurrenceInput({ title: "Simulado", day: "13/11/2026", timeOfDay: "" })).toEqual({ ok: false, reason: "dia-invalido" });
  });
});
