import { describe, expect, it } from "vitest";
import { buildSuggestedName } from "@/lib/stood/details";

describe("buildSuggestedName", () => {
  it("mantém o texto que já cabe no nome", () => {
    expect(buildSuggestedName("Limites e derivadas")).toBe("Limites e derivadas");
  });

  it("corta o texto longo em 50 caracteres com reticências", () => {
    const name = buildSuggestedName("Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)");

    expect(name).toBe("Rick Astley - Never Gonna Give You Up (Official V…");
  });

  it("tira o espaço que sobra antes das reticências", () => {
    expect(buildSuggestedName(`${"a".repeat(48)} bcd`)).toBe(`${"a".repeat(48)}…`);
  });

  it("não parte um emoji ao cortar", () => {
    const name = buildSuggestedName(`${"a".repeat(48)}🎓🎓`);

    expect(name).toBe(`${"a".repeat(48)}…`);
  });

  it("troca / e \\ por hífen", () => {
    expect(buildSuggestedName("Aula 1/2 \\ Limites")).toBe("Aula 1-2 - Limites");
  });

  it("junta espaços repetidos e apara as pontas", () => {
    expect(buildSuggestedName("  Aula   de \n Limites  ")).toBe("Aula de Limites");
  });
});
