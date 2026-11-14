"use client";

import { type FormEvent, useState } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { GithubLogo, GoogleLogo } from "@/app/_components/brand-icons";
import { BUTTON, FIELD, FIELD_LABEL, INPUT, TEXT_LINK } from "@/app/_components/ui";
import { authClient } from "@/lib/auth/client";
import { buildAuthErrorMessage } from "@/lib/auth/errors";

const AFTER_SIGN_IN_PATH = "/biblioteca";

export function SignInForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState(initialError);
  const [isPending, setIsPending] = useState(false);

  async function signInWithProvider(provider: "google" | "github") {
    setIsPending(true);
    const { error: signInError } = await authClient.signIn.social({
      provider,
      callbackURL: AFTER_SIGN_IN_PATH,
      errorCallbackURL: "/entrar",
    });
    // Sem erro, o navegador já saiu para o Google ou o GitHub
    if (signInError) {
      setError(buildAuthErrorMessage(signInError));
      setIsPending(false);
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsPending(true);
    setError(undefined);

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      callbackURL: AFTER_SIGN_IN_PATH,
    });
    if (signInError) {
      setError(buildAuthErrorMessage(signInError));
      setIsPending(false);
      return;
    }
    window.location.assign(AFTER_SIGN_IN_PATH);
  }

  return (
    <div className="grid gap-4">
      {error && <FormMessage tone="error">{error}</FormMessage>}

      <div className="grid gap-2">
        <button type="button" disabled={isPending} onClick={() => signInWithProvider("google")} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
          <GoogleLogo />
          Entrar com Google
        </button>
        <button type="button" disabled={isPending} onClick={() => signInWithProvider("github")} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
          <GithubLogo />
          Entrar com GitHub
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        ou com e-mail
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={signInWithEmail} className="grid gap-3">
        <label className={FIELD}>
          <span className={FIELD_LABEL}>E-mail</span>
          <input name="email" type="email" autoComplete="email" required className={INPUT} />
        </label>
        <label className={FIELD}>
          <span className={FIELD_LABEL}>Senha</span>
          <input name="password" type="password" autoComplete="current-password" required className={INPUT} />
        </label>
        <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
          Entrar
        </button>
      </form>

      <div className="flex flex-wrap justify-between gap-2">
        <a href="/esqueci-a-senha" className={TEXT_LINK}>
          Esqueci a senha
        </a>
        <a href="/cadastro" className={TEXT_LINK}>
          Criar conta
        </a>
      </div>
    </div>
  );
}
