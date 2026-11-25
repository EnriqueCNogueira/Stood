import { describe, expect, it } from "vitest";
import { buildConfirmDeletionPath, buildSignInPath, parseDestination } from "@/lib/auth/destination";

describe("parseDestination", () => {
  it.each(["/perfil", buildConfirmDeletionPath("abc_DEF-123")])("aceita %s", (destination) => {
    expect(parseDestination(destination)).toBe(destination);
  });

  it.each([
    "https://exemplo.com/perfil",
    "//exemplo.com",
    "/\\exemplo.com",
    "/perfil/apagar",
    "/perfil/apagar?codigo=abc&outro=1",
    "/perfil/../entrar",
    "",
    undefined,
    ["/perfil"],
  ])("troca %j pela Biblioteca", (destination) => {
    expect(parseDestination(destination)).toBe("/biblioteca");
  });
});

describe("buildSignInPath", () => {
  it("leva o destino conhecido, codificado", () => {
    expect(buildSignInPath("/perfil/apagar?codigo=abc")).toBe("/entrar?destino=%2Fperfil%2Fapagar%3Fcodigo%3Dabc");
  });

  it.each(["/biblioteca", "https://exemplo.com", null])("não leva destino para %j", (destination) => {
    expect(buildSignInPath(destination)).toBe("/entrar");
  });
});
