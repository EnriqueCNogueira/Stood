import { describe, expect, it } from "vitest";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, parseSidebarWidth } from "@/lib/board/preferences";

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
