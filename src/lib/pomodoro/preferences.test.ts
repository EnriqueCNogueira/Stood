import { describe, expect, it } from "vitest";
import { DEFAULT_POMODORO_PREFERENCES, parsePomodoroPause, parsePomodoroPreferences } from "@/lib/pomodoro/preferences";

const NOW = new Date("2026-11-23T13:00:00.000Z");

describe("parsePomodoroPreferences", () => {
  it("lê as durações e o som salvos", () => {
    const stored = JSON.stringify({ version: 1, focusMinutes: 50, pauseMinutes: 10, isSoundOn: false });

    expect(parsePomodoroPreferences(stored)).toEqual({ version: 1, focusMinutes: 50, pauseMinutes: 10, isSoundOn: false });
  });

  it("usa Foco de 25 minutos, Pausa de 5 e som ligado como padrão", () => {
    expect(parsePomodoroPreferences(null)).toEqual({ version: 1, focusMinutes: 25, pauseMinutes: 5, isSoundOn: true });
  });

  it.each([
    ["Foco abaixo de 5 minutos", { focusMinutes: 4 }, { focusMinutes: 25 }],
    ["Foco acima de 120 minutos", { focusMinutes: 121 }, { focusMinutes: 25 }],
    ["Foco quebrado", { focusMinutes: 12.5 }, { focusMinutes: 25 }],
    ["Pausa abaixo de 1 minuto", { pauseMinutes: 0 }, { pauseMinutes: 5 }],
    ["Pausa acima de 60 minutos", { pauseMinutes: 61 }, { pauseMinutes: 5 }],
  ])("troca só o valor inválido pelo padrão: %s", (_case, invalid, expected) => {
    const stored = JSON.stringify({ version: 1, focusMinutes: 50, pauseMinutes: 10, isSoundOn: false, ...invalid });

    expect(parsePomodoroPreferences(stored)).toMatchObject(expected);
  });

  it.each([
    ["ilegível", "{não é json"],
    ["de outra versão", JSON.stringify({ version: 2, focusMinutes: 50 })],
  ])("volta inteiro ao padrão com valor %s", (_case, stored) => {
    expect(parsePomodoroPreferences(stored)).toEqual(DEFAULT_POMODORO_PREFERENCES);
  });
});

describe("parsePomodoroPause", () => {
  it("lê o fim da Pausa em andamento", () => {
    const endsAt = new Date(NOW.getTime() + 3 * 60_000);

    expect(parsePomodoroPause(JSON.stringify({ endsAt: endsAt.toISOString() }), NOW)).toEqual(endsAt);
  });

  it("ignora a Pausa que já terminou", () => {
    expect(parsePomodoroPause(JSON.stringify({ endsAt: NOW.toISOString() }), NOW)).toBeUndefined();
  });

  it.each([
    ["ausente", null],
    ["vazia", ""],
    ["ilegível", "{não é json"],
    ["com data inválida", JSON.stringify({ endsAt: "amanhã" })],
  ])("ignora Pausa %s", (_case, stored) => {
    expect(parsePomodoroPause(stored, NOW)).toBeUndefined();
  });
});
