import { describe, expect, it } from "vitest";
import { isStrongPassword } from "@/lib/auth/password";

describe("isStrongPassword", () => {
  it("aceita senha com 8 caracteres, letra maiúscula, número e caractere especial", () => {
    expect(isStrongPassword("Estudo#1")).toBe(true);
  });

  it.each([
    ["com menos de 8 caracteres", "Estud#1"],
    ["sem letra maiúscula", "estudo#12"],
    ["sem número", "Estudo#ab"],
    ["sem caractere especial", "Estudo123"],
  ])("recusa senha %s", (_case, password) => {
    expect(isStrongPassword(password)).toBe(false);
  });
});
