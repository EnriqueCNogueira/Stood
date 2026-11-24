"use client";

import { type FormEvent, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { type UpdateUserNameActionResult, updateUserNameAction } from "@/app/_components/profile/profile-actions";
import { BUTTON, FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";
import { MAX_USER_NAME_LENGTH, validateUserName } from "@/lib/auth/name";

type Reason = Extract<UpdateUserNameActionResult, { ok: false }>["reason"] | "inesperado";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

const REASON_MESSAGES: Record<Reason, string> = {
  "nome-vazio": "Digite o seu nome.",
  "nome-longo": `O nome pode ter até ${MAX_USER_NAME_LENGTH} caracteres.`,
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

export function NameForm({ name }: { name: string }) {
  const [draft, setDraft] = useState(name);
  const [reason, setReason] = useState<Reason | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function change(next: string) {
    setDraft(next);
    setReason(null);
    setIsSaved(false);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateUserName(draft);
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }
    startTransition(async () => {
      try {
        const result = await updateUserNameAction({ name: draft });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        setDraft(result.name);
        setIsSaved(true);
      } catch {
        setReason("inesperado");
      }
    });
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-3">
      <label className={FIELD}>
        <span className={FIELD_LABEL}>Nome</span>
        <input
          value={draft}
          autoComplete="name"
          aria-invalid={reason !== null}
          aria-describedby={reason ? "profile-name-error" : undefined}
          onChange={(event) => change(event.target.value)}
          className={INPUT}
        />
      </label>
      {reason && (
        <FormMessage tone="error" id="profile-name-error">
          {REASON_MESSAGES[reason]}
        </FormMessage>
      )}
      {isSaved && <FormMessage tone="success">Nome salvo.</FormMessage>}
      <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary} justify-self-start`}>
        Salvar nome
      </button>
    </form>
  );
}
