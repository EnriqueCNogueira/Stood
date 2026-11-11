import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/email";

describe("sendEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", RESEND_API_KEY);
  });

  it("envia pelo Resend com a chave e o remetente do Stood", async () => {
    const fetchMock = vi.fn(async () => Response.json(RESEND_SUCCESS));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail(MESSAGE);

    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Stood <nao-responda@stood.dev>",
        to: [MESSAGE.to],
        subject: MESSAGE.subject,
        text: MESSAGE.text,
        html: MESSAGE.html,
      }),
    });
  });

  it("sem a chave, fora de produção, mostra o link no terminal e não chama o Resend", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendEmail(MESSAGE);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith("email not sent: RESEND_API_KEY missing", {
      subject: MESSAGE.subject,
      text: MESSAGE.text,
    });
  });

  it("lança erro e loga só o status quando o Resend recusa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(RESEND_VALIDATION_ERROR, { status: 422 })));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendEmail(MESSAGE)).rejects.toThrow("resend-request-failed");
    expect(consoleError).toHaveBeenCalledWith("resend request failed", { status: 422 });
  });

  it("lança erro quando a resposta do Resend sai do contrato", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ object: "email" })));

    await expect(sendEmail(MESSAGE)).rejects.toThrow();
  });
});

// --- Funções auxiliares ---

const RESEND_API_KEY = "re_123456789_chave_de_teste";

const MESSAGE = {
  to: "ana.souza@exemplo.com",
  subject: "Confirme seu e-mail no Stood",
  text: "Abra o link para confirmar: http://localhost:3000/auth/verify-email?token=abc",
  html: '<p><a href="http://localhost:3000/auth/verify-email?token=abc">Confirmar e-mail</a></p>',
};

// Formatos copiados da documentação da API de e-mails do Resend
const RESEND_SUCCESS = { id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" };
const RESEND_VALIDATION_ERROR = {
  statusCode: 422,
  message: "Invalid `to` field. The email address needs to follow the `email@example.com` format.",
  name: "validation_error",
};
