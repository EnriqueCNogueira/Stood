"use client";

import { type FormEvent, useState } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { ProfileSection, SignInAgainNotice } from "@/app/_components/profile/profile-section";
import { BUTTON, FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";
import { authClient } from "@/lib/auth/client";
import { REQUEST_DELETION_PATH } from "@/lib/auth/destination";
import { buildAuthErrorMessage } from "@/lib/auth/errors";

// Pede o link de apagar; quem apaga é o botão da página que o link abre
export function DeletionSection({ email, isFresh }: { email: string; isFresh: boolean }) {
  const [typedEmail, setTypedEmail] = useState("");
  const [error, setError] = useState<string>();
  const [isSent, setIsSent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(undefined);
    const { error: requestError } = await authClient.$fetch(REQUEST_DELETION_PATH, { method: "POST", body: { email: typedEmail } });
    setIsPending(false);
    if (requestError) {
      setError(buildAuthErrorMessage(requestError));
      return;
    }
    setIsSent(true);
  }

  return (
    <ProfileSection
      id="profile-deletion"
      title="Apagar"
      description="Apaga o seu cadastro com todos os seus Stoods, Arquivos, Tags, Focos e Compromissos. Não dá para desfazer."
    >
      <p className="text-ui text-text-muted">
        Exporte antes os Stoods que quiser guardar, pelo botão Exportar Stood do Quadro. A permissão que você deu no Google ou no GitHub só sai por
        lá.
      </p>
      {!isFresh && <SignInAgainNotice action="apagar o seu cadastro" />}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {isSent ? (
        <FormMessage tone="success">
          Mandamos um link para <span className="wrap-anywhere">{email}</span>. Ele vale por 1 hora e abre a página em que você confirma.
        </FormMessage>
      ) : (
        <form onSubmit={requestDeletion} noValidate className="grid gap-3">
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Digite o seu e-mail para continuar</span>
            <input
              value={typedEmail}
              type="email"
              autoComplete="off"
              placeholder={email}
              onChange={(event) => setTypedEmail(event.target.value)}
              className={INPUT}
            />
          </label>
          <button type="submit" disabled={isPending || !isFresh} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger} justify-self-start`}>
            Apagar meu cadastro
          </button>
        </form>
      )}
    </ProfileSection>
  );
}
