import { describe, expect, it } from "vitest";
import { buildAuthErrorMessage } from "@/lib/auth/errors";

const GENERIC_MESSAGE = "Não deu certo. Tente de novo.";

describe("buildAuthErrorMessage", () => {
  it("traduz o código conhecido da Better Auth", () => {
    expect(buildAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("E-mail ou senha incorretos.");
  });

  // O código chega pela URL de /entrar?error=, então qualquer texto pode aparecer
  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "devolve a mensagem genérica para o código %s, nome herdado de Object",
    (code) => {
      expect(buildAuthErrorMessage({ code })).toBe(GENERIC_MESSAGE);
    },
  );
});
