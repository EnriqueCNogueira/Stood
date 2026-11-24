"use client";

import { X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import {
  type CreateDrawingFileActionResult,
  type CreateFolderActionResult,
  type CreateNoteFileActionResult,
  createDrawingFileAction,
  createFolderAction,
  createNoteFileAction,
} from "@/app/_components/workspace/board/file-actions";
import { FOLDER_NOT_FOUND_MESSAGE, FolderField, type FolderOption } from "@/app/_components/workspace/board/folder-field";
import { MAX_NAME_LENGTH, validateName } from "@/lib/stood/details";
import type { StoodTreeNode } from "@/lib/stood/tree";

type NamedType = "note" | "drawing" | "folder";

// Toda recusa possível do modal tem mensagem: um reason novo sem texto não compila
type DialogReason =
  | Exclude<CreateNoteFileActionResult | CreateDrawingFileActionResult | CreateFolderActionResult, { ok: true }>["reason"]
  | "inesperado";

type CreateInput = { stoodId: string; folderId: string | null; name: string };
type CreateResult = { ok: true; node: StoodTreeNode } | { ok: false; reason: DialogReason };

// O que muda entre Nota, Desenho e Pasta: título, botão, rótulo do lugar, gênero das frases e a action que cria
const DIALOGS = {
  note: {
    title: "Nova Nota",
    submitLabel: "Criar Nota",
    folderLabel: "Pasta",
    emptyName: "Dê um nome à Nota.",
    repeatedName: "Já existe uma Nota com esse nome nesse lugar.",
    unexpected: "Não foi possível criar a Nota. Tente de novo.",
    create: async (input: CreateInput): Promise<CreateResult> => buildFileResult(await createNoteFileAction(input)),
  },
  drawing: {
    title: "Novo Desenho",
    submitLabel: "Criar Desenho",
    folderLabel: "Pasta",
    emptyName: "Dê um nome ao Desenho.",
    repeatedName: "Já existe um Desenho com esse nome nesse lugar.",
    unexpected: "Não foi possível criar o Desenho. Tente de novo.",
    create: async (input: CreateInput): Promise<CreateResult> => buildFileResult(await createDrawingFileAction(input)),
  },
  folder: {
    title: "Nova Pasta",
    submitLabel: "Criar Pasta",
    folderLabel: "Dentro de",
    emptyName: "Dê um nome à Pasta.",
    repeatedName: "Já existe uma Pasta com esse nome nesse lugar.",
    unexpected: "Não foi possível criar a Pasta. Tente de novo.",
    create: async ({ folderId, ...input }: CreateInput): Promise<CreateResult> => {
      const result = await createFolderAction({ ...input, parentId: folderId });
      return result.ok ? { ok: true, node: result.folder } : result;
    },
  },
} satisfies Record<NamedType, unknown>;

type NamedFileDialogProps = {
  type: NamedType;
  stoodId: string;
  folders: FolderOption[];
  onAdded: (node: StoodTreeNode, folderId: string | null) => void;
  onClose: () => void;
};

// Modal de "Novo Arquivo" dos tipos que só pedem nome, e de "Nova Pasta"; monta já aberto e desmonta ao fechar
export function NamedFileDialog({ type, stoodId, folders, onAdded, onClose }: NamedFileDialogProps) {
  const dialog = DIALOGS[type];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
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
    "pasta-nao-encontrada": FOLDER_NOT_FOUND_MESSAGE,
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
        const result = await dialog.create({ stoodId, folderId, name });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        onAdded(result.node, folderId);
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

        <FolderField label={dialog.folderLabel} folders={folders} value={folderId} onChange={setFolderId} />

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
            {isPending ? "Criando…" : dialog.submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function buildFileResult(result: CreateNoteFileActionResult | CreateDrawingFileActionResult): CreateResult {
  return result.ok ? { ok: true, node: result.file } : result;
}
