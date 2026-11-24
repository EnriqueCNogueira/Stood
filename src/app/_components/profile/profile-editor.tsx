"use client";

import { type ComponentProps, type FormEvent, useId, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { type PhotoChange, PhotoField, type PhotoFieldReason } from "@/app/_components/profile/photo-field";
import {
  deletePhotoAction,
  type UpdateProfileDetailsActionResult,
  updateProfileDetailsAction,
  upsertPhotoAction,
} from "@/app/_components/profile/profile-actions";
import { BUTTON, FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";
import { MAX_USER_NAME_LENGTH } from "@/lib/auth/name";
import { MAX_BIO_LENGTH, MAX_NICKNAME_LENGTH } from "@/lib/profile/rules";

type Reason = Extract<UpdateProfileDetailsActionResult, { ok: false }>["reason"] | "inesperado";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

const REASON_MESSAGES: Record<Reason, string> = {
  "nome-vazio": "Digite o seu nome.",
  "nome-longo": `O nome pode ter até ${MAX_USER_NAME_LENGTH} caracteres.`,
  "apelido-longo": `O Apelido pode ter até ${MAX_NICKNAME_LENGTH} caracteres.`,
  "apelido-com-quebra": "O Apelido fica numa linha só.",
  "bio-longa": `A Bio pode ter até ${MAX_BIO_LENGTH} caracteres.`,
  "bio-com-quebra": "A Bio fica numa linha só.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type Details = { name: string; nickname: string; bio: string };

type ProfileEditorProps = Details & {
  email: string;
  photoVersion: number | null;
  providerImage: string | null;
  onClose: (result: { hasSaved: boolean }) => void;
};

// Edição dos Dados: um "Salvar" grava a Foto, o nome, o Apelido e a Bio; "Cancelar" descarta tudo
export function ProfileEditor({ name, nickname, bio, email, photoVersion, providerImage, onClose }: ProfileEditorProps) {
  const [draft, setDraft] = useState<Details>({ name, nickname, bio });
  const [photoChange, setPhotoChange] = useState<PhotoChange | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [photoReason, setPhotoReason] = useState<PhotoFieldReason | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(next: Partial<Details>) {
    setDraft((current) => ({ ...current, ...next }));
    setReason(null);
  }

  function changePhoto(next: PhotoChange | null, refusal: PhotoFieldReason | null) {
    setPhotoReason(refusal);
    if (!refusal) setPhotoChange(next);
  }

  // Os textos vão antes porque são eles que costumam ser recusados; salvar de novo depois de uma falha é seguro
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const details = await updateProfileDetailsAction(draft);
        if (!details.ok) {
          setReason(details.reason);
          return;
        }
        const refusal = await savePhoto(photoChange);
        if (refusal) {
          setPhotoReason(refusal);
          return;
        }
        onClose({ hasSaved: true });
      } catch {
        setReason("inesperado");
      }
    });
  }

  // A recusa aparece no campo a que pertence; a inesperada, acima do botão
  function buildFieldMessage(prefix: string) {
    return reason?.startsWith(prefix) ? REASON_MESSAGES[reason] : undefined;
  }

  const isUnexpected = reason === "entrada-invalida" || reason === "inesperado";
  return (
    <form onSubmit={save} noValidate className="grid grid-cols-1 gap-3">
      <PhotoField
        name={name}
        email={email}
        photoVersion={photoVersion}
        providerImage={providerImage}
        change={photoChange}
        reason={photoReason}
        isDisabled={isPending}
        onChange={changePhoto}
      />
      <TextField
        label="Nome"
        error={buildFieldMessage("nome")}
        value={draft.name}
        autoComplete="name"
        onChange={(event) => change({ name: event.target.value })}
      />
      <TextField
        label="Apelido"
        hint="Opcional. É assim que o Stood chama você."
        error={buildFieldMessage("apelido")}
        counterLimit={MAX_NICKNAME_LENGTH}
        value={draft.nickname}
        autoComplete="nickname"
        onChange={(event) => change({ nickname: event.target.value })}
      />
      <TextField
        label="Bio"
        hint="Opcional. Uma linha sobre você."
        error={buildFieldMessage("bio")}
        counterLimit={MAX_BIO_LENGTH}
        value={draft.bio}
        autoComplete="off"
        onChange={(event) => change({ bio: event.target.value })}
      />
      {isUnexpected && <FormMessage tone="error">{REASON_MESSAGES[reason]}</FormMessage>}
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onClose({ hasSaved: false })}
          className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
        >
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
          {isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// Grava o que mudou na Foto e devolve a recusa, ou nulo quando deu certo
async function savePhoto(change: PhotoChange | null): Promise<PhotoFieldReason | null> {
  if (!change) return null;
  if (change.kind === "removed") {
    await deletePhotoAction();
    return null;
  }
  const formData = new FormData();
  formData.set("photo", change.jpeg, "foto.jpg");
  const result = await upsertPhotoAction(formData);
  return result.ok ? null : result.reason;
}

type TextFieldProps = Omit<ComponentProps<"input">, "value"> & {
  label: string;
  value: string;
  hint?: string;
  error?: string;
  counterLimit?: number;
};

function TextField({ label, value, hint, error, counterLimit, ...input }: TextFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined].filter(Boolean).join(" ");
  const length = value.trim().length;

  return (
    <div className={FIELD}>
      <label htmlFor={inputId} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        {...input}
        id={inputId}
        value={value}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy || undefined}
        className={INPUT}
      />
      {(hint || counterLimit) && (
        <div className="flex justify-between gap-3 text-meta text-text-muted">
          <span id={hintId}>{hint}</span>
          {counterLimit && (
            <span className={`flex-none font-mono ${length > counterLimit ? "text-danger" : ""}`}>
              {length}/{counterLimit}
            </span>
          )}
        </div>
      )}
      {error && (
        <FormMessage tone="error" id={errorId}>
          {error}
        </FormMessage>
      )}
    </div>
  );
}
