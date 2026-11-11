import "server-only";

import { z } from "zod";
import { requireEnv } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const SENDER = "Stood <nao-responda@stood.dev>";

const resendResponseSchema = z.object({ id: z.string() });

// Envia e-mail usando a API do Resend
export async function sendEmail(message: EmailMessage): Promise<void> {
  const { RESEND_API_KEY: apiKey } = requireEnv();
  if (!apiKey) {
    console.info("email not sent: RESEND_API_KEY missing", { subject: message.subject, text: message.text });
    return;
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: SENDER, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  });

  if (!response.ok) {
    console.error("resend request failed", { status: response.status });
    throw new Error("resend-request-failed");
  }
  resendResponseSchema.parse(await response.json());
}
