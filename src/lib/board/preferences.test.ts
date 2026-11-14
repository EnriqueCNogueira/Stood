import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOARD_PREFERENCES,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  buildBoardSnap,
  parseBoardPreferences,
  parseSidebarWidth,
} from "@/lib/board/preferences";

describe("parseBoardPreferences", () => {
  it("lê as opções salvas", () => {
    const stored = JSON.stringify({ version: 1, background: "grid", spacing: "large", snapToGrid: true, theme: "dark" });

    expect(parseBoardPreferences(stored)).toEqual({
      version: 1,
      background: "grid",
      spacing: "large",
      snapToGrid: true,
      theme: "dark",
    });
  });

  it("usa pontos, médio, encaixe desligado e Seguir o site como padrão", () => {
    expect(DEFAULT_BOARD_PREFERENCES).toEqual({
      version: 1,
      background: "dots",
      spacing: "medium",
      snapToGrid: false,
      theme: "site",
    });
  });

  it.each([
    ["ausente", null],
    ["que não é JSON", "{quadro"],
    ["que não é objeto", "42"],
    ["de versão antiga", JSON.stringify({ version: 0, background: "grid", spacing: "large", snapToGrid: true, theme: "dark" })],
  ])("volta ao padrão com valor %s", (_case, stored) => {
    expect(parseBoardPreferences(stored)).toEqual(DEFAULT_BOARD_PREFERENCES);
  });

  it("troca só a opção inválida pelo padrão", () => {
    const stored = JSON.stringify({ version: 1, background: "xadrez", spacing: "small", snapToGrid: "sim", theme: "light" });

    expect(parseBoardPreferences(stored)).toEqual({
      version: 1,
      background: "dots",
      spacing: "small",
      snapToGrid: false,
      theme: "light",
    });
  });
});

describe("buildBoardSnap", () => {
  it.each([
    ["small", 16],
    ["medium", 24],
    ["large", 32],
  ] as const)("devolve o espaçamento %s em pixels com o encaixe ligado", (spacing, pixels) => {
    expect(buildBoardSnap({ ...DEFAULT_BOARD_PREFERENCES, spacing, snapToGrid: true })).toBe(pixels);
  });

  it("não encaixa com o encaixe desligado", () => {
    expect(buildBoardSnap({ ...DEFAULT_BOARD_PREFERENCES, snapToGrid: false })).toBeNull();
  });

  it("ignora o encaixe com o fundo limpo", () => {
    expect(buildBoardSnap({ ...DEFAULT_BOARD_PREFERENCES, background: "clean", snapToGrid: true })).toBeNull();
  });
});

describe("parseSidebarWidth", () => {
  it("lê a largura salva", () => {
    expect(parseSidebarWidth("320", 264)).toBe(320);
  });

  it.each([
    ["ausente", null],
    ["que não é número", "larga"],
    ["vazia", ""],
  ])("usa a largura padrão com valor %s", (_case, stored) => {
    expect(parseSidebarWidth(stored, 264)).toBe(264);
  });

  it.each([
    ["abaixo do mínimo", "50", SIDEBAR_MIN_WIDTH],
    ["acima do máximo", "2000", SIDEBAR_MAX_WIDTH],
  ])("prende a largura %s", (_case, stored, expected) => {
    expect(parseSidebarWidth(stored, 264)).toBe(expected);
  });
});
