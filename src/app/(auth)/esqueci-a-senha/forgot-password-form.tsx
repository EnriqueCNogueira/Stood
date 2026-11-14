"use client";

import { type FormEvent, useState } from "react";
import { FormMessage } from "@/app/_components/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, INPUT, TEXT_LINK } from "@/app/_components/ui";
import { authClient } from "@/lib/auth/client";
import { buildAuthErrorMessage } from "@/lib/auth/errors";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [isSent, setIsSent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsPending(true);
    setError(undefined);

    const { error: requestError } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/redefinir-senha",
    });
    setIsPending(false);
    if (requestError) {
      setError(buildAuthErrorMessage(requestError));
      return;
    }
    setIsSent(true);
  }

  // Mesma resposta com ou sem cadastro; quem entra pelo Google ou GitHub recebe um e-mail dizendo por onde entrar
  if (isSent) {
    return <FormMessage tone="success">Se este e-mail tiver cadastro no Stood, mandamos as instruções para ele.</FormMessage>;
  }

  return (
    <form onSubmit={requestPasswordReset} className="grid gap-3">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <label className={FIELD}>
        <span className={FIELD_LABEL}>E-mail</span>
        <input name="email" type="email" autoComplete="email" required className={INPUT} />
      </label>
      <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
        Mandar link
      </button>
      <a href="/entrar" className={TEXT_LINK}>
        Voltar para entrar
      </a>
    </form>
  );
}
