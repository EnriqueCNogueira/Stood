"use client";

import { X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import {
  type CreateDrawingFileActionResult,
  type CreateNoteFileActionResult,
  createDrawingFileAction,
  createNoteFileAction,
} from "@/app/_components/workspace/board/file-actions";
import { MAX_NAME_LENGTH, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";

type NamedFileType = "note" | "drawing";

// Toda recusa possível do modal tem mensagem: um reason novo sem texto não compila
type DialogReason =
  | Exclude<CreateNoteFileActionResult | CreateDrawingFileActionResult, { ok: true }>["reason"]
  | "inesperado";

// O que muda entre Nota e Desenho: título, botão, gênero das frases e a action que cria
const DIALOGS = {
  note: {
    title: "Nova Nota",
    submitLabel: "Criar Nota",
    emptyName: "Dê um nome à Nota.",
    repeatedName: "Este Stood já tem uma Nota com esse nome.",
    unexpected: "Não foi possível criar a Nota. Tente de novo.",
    create: createNoteFileAction,
  },
  drawing: {
    title: "Novo Desenho",
    submitLabel: "Criar Desenho",
    emptyName: "Dê um nome ao Desenho.",
    repeatedName: "Este Stood já tem um Desenho com esse nome.",
    unexpected: "Não foi possível criar o Desenho. Tente de novo.",
    create: createDrawingFileAction,
  },
} satisfies Record<NamedFileType, unknown>;

type NamedFileDialogProps = {
  type: NamedFileType;
  stoodId: string;
  onAdded: (file: StoodTreeFile) => void;
  onClose: () => void;
};

// Modal de "Novo Arquivo" dos tipos que só pedem nome; monta já aberto e desmonta ao fechar
export function NamedFileDialog({ type, stoodId, onAdded, onClose }: NamedFileDialogProps) {
  const dialog = DIALOGS[type];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [reason, setReason] = useState<DialogReason | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNameError = reason !== null && reason.startsWith("nome");

  const messages: Record<DialogReason, string> = {
    "nome-vazio": dialog.emptyName,
    "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
    "nome-com-separador": "O nome não pode ter / nem \\.",
    "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
    "nome-repetido": dialog.repeatedName,
    "stood-nao-encontrado": "Este Stood não existe mais.",
    "entrada-invalida": dialog.unexpected,
    inesperado: dialog.unexpected,
  };

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
        const result = await dialog.create({ stoodId, name });
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
            {dialog.title}
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
            {messages[reason]}
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
            {dialog.submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
