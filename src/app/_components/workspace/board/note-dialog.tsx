"use client";

import { X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import { type CreateNoteFileActionResult, createNoteFileAction } from "@/app/_components/workspace/board/file-actions";
import { MAX_NAME_LENGTH, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";

const UNEXPECTED_MESSAGE = "Não foi possível criar a Nota. Tente de novo.";

// Toda recusa possível do modal tem mensagem: um reason novo sem texto não compila
type DialogReason = Exclude<CreateNoteFileActionResult, { ok: true }>["reason"] | "inesperado";

const REASON_MESSAGES: Record<DialogReason, string> = {
  "nome-vazio": "Dê um nome à Nota.",
  "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
  "nome-com-separador": "O nome não pode ter / nem \\.",
  "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
  "nome-repetido": "Este Stood já tem uma Nota com esse nome.",
  "stood-nao-encontrado": "Este Stood não existe mais.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type NoteDialogProps = {
  stoodId: string;
  onAdded: (file: StoodTreeFile) => void;
  onClose: () => void;
};

// Modal de "Novo Arquivo > Nota": monta já aberto e desmonta ao fechar, então cada abertura começa limpa
export function NoteDialog({ stoodId, onAdded, onClose }: NoteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [reason, setReason] = useState<DialogReason | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNameError = reason !== null && reason.startsWith("nome");

  useEffect(() => {
    dialogRef.current?.showModal();
    nameRef.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateName(name);
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createNoteFileAction({ stoodId, name });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        onAdded(result.file);
        dialogRef.current?.close();
      } catch {
        setReason("inesperado");
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto rounded-lg border border-border bg-surface text-text shadow-card backdrop:bg-bg/70"
    >
      <form onSubmit={submit} noValidate className="grid w-md max-w-full gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium tracking-tight">
            Nova Nota
          </h2>
          <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <label className={FIELD}>
          <span className={FIELD_LABEL}>Nome</span>
          <input
            ref={nameRef}
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setReason(null);
            }}
            autoComplete="off"
            aria-invalid={isNameError}
            aria-describedby={reason ? errorId : undefined}
            className={INPUT}
          />
          <span className={`justify-self-end font-mono text-meta ${name.length > MAX_NAME_LENGTH ? "text-danger" : "text-text-muted"}`}>
            {name.length}/{MAX_NAME_LENGTH}
          </span>
        </label>

        {reason && (
          <FormMessage tone="error" id={errorId}>
            {REASON_MESSAGES[reason]}
          </FormMessage>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
          >
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
            Criar Nota
          </button>
        </div>
      </form>
    </dialog>
  );
}
