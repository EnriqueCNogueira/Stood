import { describe, expect, it } from "vitest";
import { buildFirstName, buildRelativeTime } from "@/lib/library/library";

const NOW = new Date("2026-11-13T15:00:00Z");
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

describe("buildFirstName", () => {
  it("devolve o primeiro nome", () => {
    expect(buildFirstName("Ana Maria Souza")).toBe("Ana");
  });

  it("ignora espaços nas pontas e repetidos", () => {
    expect(buildFirstName("  Ana   Souza ")).toBe("Ana");
  });

  it("devolve vazio quando o nome é vazio", () => {
    expect(buildFirstName("   ")).toBe("");
  });
});

describe("buildRelativeTime", () => {
  it.each([
    ["agora há pouco", 20 * 1000, "agora"],
    ["minutos atrás", 5 * MS_PER_MINUTE, "há 5 minutos"],
    ["horas atrás", 3 * MS_PER_HOUR, "há 3 horas"],
    ["um dia atrás", 30 * MS_PER_HOUR, "ontem"],
    ["dias atrás", 3 * MS_PER_DAY, "há 3 dias"],
    ["uma semana atrás", 8 * MS_PER_DAY, "semana passada"],
    ["semanas atrás", 15 * MS_PER_DAY, "há 2 semanas"],
    ["um mês atrás", 31 * MS_PER_DAY, "mês passado"],
    ["meses atrás", 125 * MS_PER_DAY, "há 4 meses"],
    ["anos atrás", 800 * MS_PER_DAY, "há 2 anos"],
  ])("descreve %s", (_case, elapsed, expected) => {
    expect(buildRelativeTime(new Date(NOW.getTime() - elapsed), NOW)).toBe(expected);
  });

  it("trata data no futuro, de relógio adiantado, como agora", () => {
    expect(buildRelativeTime(new Date(NOW.getTime() + 5 * MS_PER_MINUTE), NOW)).toBe("agora");
  });
});
