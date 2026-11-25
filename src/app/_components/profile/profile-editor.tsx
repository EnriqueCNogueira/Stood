"use client";

import { type ComponentProps, type FormEvent, type TransitionStartFunction, useId, useState } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { buildPhoto, type PhotoChange, PhotoField, type PhotoFieldReason } from "@/app/_components/profile/photo-field";
import { type UpdateProfileActionResult, updateProfileAction } from "@/app/_components/profile/profile-actions";
import { BUTTON, FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";
import { MAX_USER_NAME_LENGTH } from "@/lib/auth/name";
import { MAX_BIO_LENGTH, MAX_NICKNAME_LENGTH, type PhotoReason } from "@/lib/profile/rules";

type ActionReason = Extract<UpdateProfileActionResult, { ok: false }>["reason"];
// A recusa da Foto aparece no campo dela
type Reason = Exclude<ActionReason, PhotoReason> | "inesperado";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

const REASON_MESSAGES: Record<Reason, string> = {
  "nome-vazio": "Digite o seu nome.",
  "nome-longo": `O nome pode ter até ${MAX_USER_NAME_LENGTH} caracteres.`,
  "apelido-longo": `O Apelido pode ter até ${MAX_NICKNAME_LENGTH} caracteres.`,
  "apelido-com-controle": "O Apelido não pode ter quebra de linha nem caractere invisível.",
  "bio-longa": `A Bio pode ter até ${MAX_BIO_LENGTH} caracteres.`,
  "bio-com-controle": "A Bio não pode ter quebra de linha nem caractere invisível.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type Details = { name: string; nickname: string; bio: string };

type ProfileEditorProps = Details & {
  email: string;
  photoVersion: number | null;
  providerImage: string | null;
  isSaving: boolean;
  startSaving: TransitionStartFunction;
  onClose: (result: { hasSaved: boolean }) => void;
};

// Edição dos Dados: um "Salvar" grava juntos a Foto, o nome, o Apelido e a Bio; "Cancelar" descarta tudo
export function ProfileEditor({
  name,
  nickname,
  bio,
  email,
  photoVersion,
  providerImage,
  isSaving,
  startSaving,
  onClose,
}: ProfileEditorProps) {
  const [draft, setDraft] = useState<Details>({ name, nickname, bio });
  const [photoChange, setPhotoChange] = useState<PhotoChange | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [photoReason, setPhotoReason] = useState<PhotoFieldReason | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  function change(next: Partial<Details>) {
    setDraft((current) => ({ ...current, ...next }));
    setReason(null);
  }

  function changePhoto(next: PhotoChange | null) {
    setPhotoReason(null);
    setPhotoChange(next);
  }

  // O "Salvar" espera o recorte; a recusa mantém a mudança que havia antes
  async function pickPhoto(file: File) {
    setIsPreparing(true);
    const result = await buildPhoto(file);
    setIsPreparing(false);
    if (result.ok) changePhoto({ kind: "picked", jpeg: result.jpeg, previewUrl: URL.createObjectURL(result.jpeg) });
    else setPhotoReason(result.reason);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      try {
        const result = await updateProfileAction(buildFormData(draft, photoChange));
        if (result.ok) onClose({ hasSaved: true });
        else showRefusal(result.reason);
      } catch {
        setReason("inesperado");
      }
    });
  }

  function showRefusal(refusal: ActionReason) {
    if (isPhotoReason(refusal)) setPhotoReason(refusal);
    else setReason(refusal);
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
        isPreparing={isPreparing}
        isDisabled={isSaving || isPreparing}
        onPick={(file) => void pickPhoto(file)}
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
          disabled={isSaving}
          onClick={() => onClose({ hasSaved: false })}
          className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
        >
          Cancelar
        </button>
        <button type="submit" disabled={isSaving || isPreparing} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
          {isSaving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function isPhotoReason(reason: ActionReason): reason is PhotoReason {
  return reason.startsWith("foto");
}

// Sem campo de Foto, a que está salva continua
function buildFormData({ name, nickname, bio }: Details, photoChange: PhotoChange | null) {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("nickname", nickname);
  formData.set("bio", bio);
  if (photoChange?.kind === "picked") formData.set("photo", photoChange.jpeg, "foto.jpg");
  if (photoChange?.kind === "removed") formData.set("isPhotoRemoved", "true");
  return formData;
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
