import { describe, expect, it } from "vitest";
import { buildCountdownLabel, buildGoalProgress, buildStudiedTimeLabel } from "@/lib/pomodoro/time";

describe("buildCountdownLabel", () => {
  it.each([
    [25 * 60_000, "25:00"],
    [12 * 60_000 + 34_000, "12:34"],
    [120 * 60_000, "120:00"],
    // Arredonda para cima, para mostrar 00:01 até o último segundo
    [400, "00:01"],
    [0, "00:00"],
    [-5_000, "00:00"],
  ])("mostra %s ms como %s", (milliseconds, label) => {
    expect(buildCountdownLabel(milliseconds)).toBe(label);
  });
});

describe("buildStudiedTimeLabel", () => {
  it.each([
    [0, "0 min"],
    [59, "0 min"],
    [45 * 60, "45 min"],
    [2 * 3600, "2 h"],
    [2 * 3600 + 15 * 60 + 59, "2 h 15 min"],
  ])("mostra %s segundos como %s", (seconds, label) => {
    expect(buildStudiedTimeLabel(seconds)).toBe(label);
  });
});

describe("buildGoalProgress", () => {
  it("calcula a porcentagem da Meta semanal já estudada", () => {
    expect(buildGoalProgress(3 * 3600, 600)).toBe(30);
  });

  it("para em 100 quando o Tempo estudado passa da meta", () => {
    expect(buildGoalProgress(12 * 3600, 600)).toBe(100);
  });
});
