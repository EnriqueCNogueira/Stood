"use client";

import { type FormEvent, useState } from "react";
import { FormMessage, NewPasswordField } from "@/components/auth-card";
import { BUTTON } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { buildAuthErrorMessage } from "@/lib/auth/errors";
import { isStrongPassword } from "@/lib/auth/password";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string>();
  const [isDone, setIsDone] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (!isStrongPassword(newPassword)) {
      setError(buildAuthErrorMessage({ code: "PASSWORD_TOO_WEAK" }));
      return;
    }
    setIsPending(true);
    setError(undefined);

    // A troca encerra as outras sessões do Usuário (revokeSessionsOnPasswordReset)
    const { error: resetError } = await authClient.resetPassword({
      token,
      newPassword,
    });
    setIsPending(false);
    if (resetError) {
      setError(buildAuthErrorMessage(resetError));
      return;
    }
    setIsDone(true);
  }

  if (isDone) {
    return (
      <div className="grid gap-3">
        <FormMessage tone="success">Senha trocada. As outras sessões foram encerradas.</FormMessage>
        <a href="/entrar" className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
          Entrar com a senha nova
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={resetPassword} className="grid gap-3">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <NewPasswordField label="Senha nova" />
      <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
        Trocar senha
      </button>
    </form>
  );
}
