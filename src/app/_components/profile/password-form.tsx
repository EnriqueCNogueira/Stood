"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { PasswordField } from "@/app/_components/auth/password-field";
import { BUTTON } from "@/app/_components/ui";
import { authClient } from "@/lib/auth/client";
import { buildAuthErrorMessage } from "@/lib/auth/errors";
import { isStrongPassword, PASSWORD_HINT } from "@/lib/auth/password";

const DIFFERENT_PASSWORDS_MESSAGE = "As senhas novas não são iguais.";

// Troca de senha pelo client da biblioteca, porque o limite de tentativas só vale por HTTP
export function PasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [confirmationError, setConfirmationError] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  // Cada troca remonta os campos, para voltarem vazios e escondidos
  const [changeCount, setChangeCount] = useState(0);
  const isDone = changeCount > 0 && !error && !confirmationError && !isPending;

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    setError(undefined);
    setConfirmationError(undefined);
    if (!isStrongPassword(newPassword)) {
      setError(buildAuthErrorMessage({ code: "PASSWORD_TOO_WEAK" }));
      return;
    }
    if (newPassword !== String(form.get("newPasswordConfirmation"))) {
      setConfirmationError(DIFFERENT_PASSWORDS_MESSAGE);
      return;
    }
    setIsPending(true);

    try {
      const { error: changeError } = await authClient.changePassword({ currentPassword: String(form.get("currentPassword")), newPassword });
      if (changeError) {
        setError(buildAuthErrorMessage(changeError));
      } else {
        setChangeCount((count) => count + 1);
        // A lista de Sessões mudou: as outras foram encerradas
        router.refresh();
      }
    } catch {
      setError(buildAuthErrorMessage({}));
    }
    setIsPending(false);
  }

  return (
    <form onSubmit={changePassword} className="grid gap-3">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {isDone && <FormMessage tone="success">Senha trocada. As outras sessões foram encerradas.</FormMessage>}
      <div key={changeCount} className="grid gap-3">
        <PasswordField label="Senha atual" name="currentPassword" autoComplete="current-password" />
        <PasswordField
          label="Senha nova"
          name="newPassword"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
        />
        <PasswordField
          label="Confirmar senha nova"
          name="newPasswordConfirmation"
          autoComplete="new-password"
          error={confirmationError}
        />
      </div>
      <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary} justify-self-start`}>
        Trocar senha
      </button>
    </form>
  );
}
