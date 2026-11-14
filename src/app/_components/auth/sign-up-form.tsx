"use client";

import { type FormEvent, useState } from "react";
import { FormMessage, NewPasswordField } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, INPUT, TEXT_LINK } from "@/app/_components/ui";
import { authClient } from "@/lib/auth/client";
import { buildAuthErrorMessage } from "@/lib/auth/errors";
import { isStrongPassword } from "@/lib/auth/password";

export function SignUpForm() {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (!isStrongPassword(password)) {
      setError(buildAuthErrorMessage({ code: "PASSWORD_TOO_WEAK" }));
      return;
    }
    setIsPending(true);
    setError(undefined);

    // Clicar no link de confirmação já abre a sessão e leva para a biblioteca
    const { error: signUpError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email,
      password,
      callbackURL: "/biblioteca",
    });
    setIsPending(false);
    if (signUpError) {
      setError(buildAuthErrorMessage(signUpError));
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <FormMessage tone="success">
        Enviamos um link de confirmação para {sentTo}.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={signUp} className="grid gap-3">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <label className={FIELD}>
        <span className={FIELD_LABEL}>Nome</span>
        <input name="name" autoComplete="name" required className={INPUT} />
      </label>
      <label className={FIELD}>
        <span className={FIELD_LABEL}>E-mail</span>
        <input name="email" type="email" autoComplete="email" required className={INPUT} />
      </label>
      <NewPasswordField label="Senha" />
      <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
        Criar conta
      </button>
      <a href="/entrar" className={TEXT_LINK}>
        Já tenho conta
      </a>
    </form>
  );
}
