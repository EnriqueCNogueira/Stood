import { vi } from "vitest";

export type SentEmail = { from: string; to: string[]; subject: string; text: string; html: string };

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

// Liga o envio pelo Resend com o fetch stubado e devolve a caixa de saída, preenchida a cada envio
export function stubResend() {
  vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");
  const outbox: SentEmail[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url !== RESEND_EMAILS_URL) throw new Error(`unexpected fetch: ${url}`);
      outbox.push(JSON.parse(String(init?.body)));
      return Response.json({ id: crypto.randomUUID() });
    }),
  );

  return outbox;
}

// Primeiro link do texto do e-mail
export function findLink(email: SentEmail) {
  return email.text.match(/https?:\/\/\S+/)?.[0];
}
