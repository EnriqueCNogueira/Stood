import { describe, expect, it } from "vitest";
import { buildTheme } from "@/lib/theme/theme";

describe("buildTheme", () => {
  it.each([
    ["Claro", "light", true, "light"],
    ["Escuro", "dark", false, "dark"],
  ] as const)("usa %s guardado e ignora o sistema", (_case, stored, prefersDark, expected) => {
    expect(buildTheme(stored, prefersDark)).toBe(expected);
  });

  it.each([
    ["escuro", true, "dark"],
    ["claro", false, "light"],
  ] as const)("com Sistema guardado, segue o sistema %s", (_case, prefersDark, expected) => {
    expect(buildTheme("system", prefersDark)).toBe(expected);
  });

  it.each([
    ["sem valor guardado", null],
    ["com valor inválido", "sepia"],
    ["com valor vazio", ""],
  ])("cai em Sistema %s", (_case, stored) => {
    expect(buildTheme(stored, true)).toBe("dark");
    expect(buildTheme(stored, false)).toBe("light");
  });
});
