"use client";

import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { useDismiss } from "@/app/_components/dismiss";
import { BUTTON, DIALOG, FIELD, FIELD_LABEL, FOCUS, ICON_BUTTON, INPUT, MENU_ITEM, POPOVER } from "@/app/_components/ui";
import {
  type DeleteFileActionResult,
  type UpdateFileNameActionResult,
  deleteFileAction,
  updateFileNameAction,
} from "@/app/_components/workspace/board/file-actions";
import { FILE_TYPE_LABELS } from "@/app/_components/workspace/file-type-icon";
import { MAX_NAME_LENGTH, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";

const NOT_FOUND_MESSAGE = "Este Arquivo não existe mais. Recarregue a página.";

type RenameReason = Exclude<UpdateFileNameActionResult, { ok: true }>["reason"] | "inesperado";
type DeleteReason = Exclude<DeleteFileActionResult, { ok: true }>["reason"] | "inesperado";

const RENAME_MESSAGES: Record<RenameReason, string> = {
  "nome-vazio": "Dê um nome ao Arquivo.",
  "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
  "nome-com-separador": "O nome não pode ter / nem \\.",
  "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
  "nome-repetido": "Já existe um Arquivo desse tipo com esse nome nesse lugar.",
  "arquivo-nao-encontrado": NOT_FOUND_MESSAGE,
  "entrada-invalida": "Não foi possível renomear. Tente de novo.",
  inesperado: "Não foi possível renomear. Tente de novo.",
};

const DELETE_MESSAGES: Record<DeleteReason, string> = {
  "arquivo-nao-encontrado": NOT_FOUND_MESSAGE,
  "entrada-invalida": "Não foi possível apagar. Tente de novo.",
  inesperado: "Não foi possível apagar. Tente de novo.",
};

type FileRowMenuProps = {
  file: StoodTreeFile;
  onRenamed: (fileId: string, name: string) => void;
  onDeleted: (fileId: string) => void;
};

// Botão "…" ao lado do Arquivo na barra lateral do Quadro: Renomear e Apagar
export function FileRowMenu({ file, onRenamed, onDeleted }: FileRowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  useDismiss(containerRef, isOpen, close);

  function choose(next: "rename" | "delete") {
    setIsOpen(false);
    setDialog(next);
  }

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        type="button"
        aria-label={`Ações de ${file.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        // No computador aparece ao passar o mouse ou focar a linha; no toque fica sempre visível
        className={`${ICON_BUTTON} md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:aria-expanded:opacity-100`}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {isOpen && (
        <div role="menu" aria-label={`Ações de ${file.name}`} className={`absolute top-8 right-0 z-10 w-36 p-1 ${POPOVER}`}>
          <button type="button" role="menuitem" onClick={() => choose("rename")} className={`${MENU_ITEM} cursor-pointer gap-2 hover:bg-surface-2 ${FOCUS}`}>
            <Pencil size={14} aria-hidden />
            Renomear
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose("delete")}
            className={`${MENU_ITEM} cursor-pointer gap-2 text-danger hover:bg-surface-2 ${FOCUS}`}
          >
            <Trash2 size={14} aria-hidden />
            Apagar
          </button>
        </div>
      )}
      {dialog === "rename" && <RenameFileDialog file={file} onRenamed={onRenamed} onClose={closeDialog} />}
      {dialog === "delete" && <DeleteFileDialog file={file} onDeleted={onDeleted} onClose={closeDialog} />}
    </div>
  );
}

function RenameFileDialog({ file, onRenamed, onClose }: { file: StoodTreeFile; onRenamed: FileRowMenuProps["onRenamed"]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [name, setName] = useState(file.name);
  const [reason, setReason] = useState<RenameReason | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
    nameRef.current?.select();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name === file.name) {
      dialogRef.current?.close();
      return;
    }
    const validation = validateName(name);
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateFileNameAction({ fileId: file.id, name });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        onRenamed(file.id, result.name);
        dialogRef.current?.close();
      } catch {
        setReason("inesperado");
      }
    });
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onClose={onClose} className={DIALOG}>
      <form onSubmit={submit} noValidate className="grid w-md max-w-full gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium tracking-tight">
            Renomear {FILE_TYPE_LABELS[file.type]}
          </h2>
          <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <label className={FIELD}>
          <span className={FIELD_LABEL}>Nome</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setReason(null);
            }}
            autoComplete="off"
            aria-invalid={reason !== null && reason.startsWith("nome")}
            aria-describedby={reason ? errorId : undefined}
            className={INPUT}
          />
          <span className={`justify-self-end font-mono text-meta ${name.length > MAX_NAME_LENGTH ? "text-danger" : "text-text-muted"}`}>
            {name.length}/{MAX_NAME_LENGTH}
          </span>
        </label>

        {reason && (
          <FormMessage tone="error" id={errorId}>
            {RENAME_MESSAGES[reason]}
          </FormMessage>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
            {isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteFileDialog({ file, onDeleted, onClose }: { file: StoodTreeFile; onDeleted: FileRowMenuProps["onDeleted"]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<DeleteReason | null>(null);
  const [isPending, startTransition] = useTransition();

  // O foco começa em Cancelar: Enter logo ao abrir não apaga nada
  useEffect(() => {
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }, []);

  function remove() {
    startTransition(async () => {
      try {
        const result = await deleteFileAction({ fileId: file.id });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        onDeleted(file.id);
        dialogRef.current?.close();
      } catch {
        setReason("inesperado");
      }
    });
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onClose={onClose} className={DIALOG}>
      <div className="grid w-md max-w-full gap-4 p-5">
        <h2 id={titleId} className="text-lg font-medium tracking-tight">
          Apagar {FILE_TYPE_LABELS[file.type]}
        </h2>
        <p className="text-ui text-text-muted">
          <span className="font-medium text-text">{file.name}</span> sai do Stood, e a Janela dele fecha. Não dá para desfazer.
        </p>

        {reason && <FormMessage tone="error">{DELETE_MESSAGES[reason]}</FormMessage>}

        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
          >
            Cancelar
          </button>
          <button type="button" disabled={isPending} onClick={remove} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger}`}>
            {isPending ? "Apagando…" : "Apagar"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
