"use client";

import { ImageUp, X } from "lucide-react";
import { type ClipboardEvent, type DragEvent, type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import { type CreateImageFileActionResult, createImageFileAction } from "@/app/_components/workspace/board/file-actions";
import { FOLDER_NOT_FOUND_MESSAGE, FolderField, type FolderOption } from "@/app/_components/workspace/board/folder-field";
import {
  IMAGE_ACCEPT,
  IMAGE_HEADER_BYTES,
  MAX_IMAGE_BYTES,
  buildImageFileName,
  parseImageType,
} from "@/lib/file/image";
import { MAX_NAME_LENGTH, validateName } from "@/lib/stood/details";
import type { StoodTreeFile } from "@/lib/stood/tree";

const UNEXPECTED_MESSAGE = "Não foi possível adicionar a Imagem. Tente de novo.";
const MAX_IMAGE_MEGABYTES = MAX_IMAGE_BYTES / (1024 * 1024);

// Toda recusa possível do modal tem mensagem: um reason novo sem texto não compila
type DialogReason = Exclude<CreateImageFileActionResult, { ok: true }>["reason"] | "inesperado";

const REASON_MESSAGES: Record<DialogReason, string> = {
  "imagem-vazia": "Este arquivo está vazio.",
  "imagem-grande": `A Imagem pode ter até ${MAX_IMAGE_MEGABYTES} MB.`,
  "formato-nao-suportado": "Use uma imagem PNG, JPEG ou WebP.",
  "nome-vazio": "Dê um nome à Imagem.",
  "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
  "nome-com-separador": "O nome não pode ter / nem \\.",
  "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
  "nome-repetido": "Já existe uma Imagem com esse nome nesse lugar.",
  "stood-nao-encontrado": "Este Stood não existe mais.",
  "pasta-nao-encontrada": FOLDER_NOT_FOUND_MESSAGE,
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type Picked = { file: File; previewUrl: string };

type ImageDialogProps = {
  stoodId: string;
  folders: FolderOption[];
  onAdded: (file: StoodTreeFile, folderId: string | null) => void;
  onClose: () => void;
};

// Modal de "Novo Arquivo > Imagem": escolher, arrastar ou colar; monta já aberto e desmonta ao fechar
export function ImageDialog({ stoodId, folders, onAdded, onClose }: ImageDialogProps) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [name, setName] = useState("");
  const [reason, setReason] = useState<DialogReason | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isNameError = reason !== null && reason.startsWith("nome");

  useEffect(() => {
    dialogRef.current?.showModal();
    pickerRef.current?.focus();
  }, []);

  // A prévia é um link para os bytes na memória do navegador: some ao trocar de imagem ou fechar
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.previewUrl);
  }, [picked]);

  // Confere tamanho e formato antes de mostrar, com a mesma regra do servidor
  async function pickImage(file: File | undefined) {
    if (!file) return;
    setReason(null);
    if (file.size === 0) return setReason("imagem-vazia");
    if (file.size > MAX_IMAGE_BYTES) return setReason("imagem-grande");
    const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer());
    if (!parseImageType(header)) return setReason("formato-nao-suportado");

    setPicked({ file, previewUrl: URL.createObjectURL(file) });
    setName(buildImageFileName(file.name));
  }

  function dropImage(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    void pickImage(event.dataTransfer.files[0]);
  }

  // Ctrl+V com um print copiado; no campo de nome, colar texto segue normal
  function pasteImage(event: ClipboardEvent<HTMLDialogElement>) {
    const file = event.clipboardData.files[0];
    if (!file) return;
    event.preventDefault();
    void pickImage(file);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!picked) return;
    const validation = validateName(name);
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }

    const formData = new FormData();
    formData.set("stoodId", stoodId);
    formData.set("name", name);
    if (folderId) formData.set("folderId", folderId);
    formData.set("image", picked.file);
    startTransition(async () => {
      try {
        const result = await createImageFileAction(formData);
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        onAdded(result.file, folderId);
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
      onPaste={pasteImage}
      className="m-auto rounded-lg border border-border bg-surface text-text shadow-card backdrop:bg-bg/70"
    >
      <form onSubmit={submit} noValidate className="grid w-md max-w-full gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium tracking-tight">
            Nova Imagem
          </h2>
          <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={dropImage}
          className={`relative grid aspect-video cursor-pointer place-content-center justify-items-center gap-2 overflow-hidden rounded-md border border-dashed px-6 text-center transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
            isDraggingOver ? "border-accent bg-accent/5" : "border-border hover:bg-surface-2"
          }`}
        >
          <input
            ref={pickerRef}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={(event) => void pickImage(event.target.files?.[0])}
            aria-describedby={reason && !isNameError ? errorId : undefined}
            className="sr-only"
          />
          {picked ? (
            <>
              {/* A prévia vem da memória do navegador, ainda sem enviar nada */}
              <img src={picked.previewUrl} alt="" className="absolute inset-0 size-full bg-bg object-contain" />
              <span className="sr-only">Trocar a imagem escolhida</span>
            </>
          ) : (
            <>
              <ImageUp size={28} strokeWidth={1.5} aria-hidden className="text-text-muted" />
              <span className="text-ui">
                <span className="text-accent-text underline underline-offset-2">Escolha uma imagem</span>, arraste para cá ou cole
                com Ctrl+V
              </span>
              <span className="font-mono text-meta text-text-muted">PNG, JPEG ou WebP, até {MAX_IMAGE_MEGABYTES} MB</span>
            </>
          )}
        </label>

        {picked && (
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Nome</span>
            <input
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setReason(null);
              }}
              autoComplete="off"
              aria-invalid={isNameError}
              aria-describedby={isNameError ? errorId : undefined}
              className={INPUT}
            />
            <span className={`justify-self-end font-mono text-meta ${name.length > MAX_NAME_LENGTH ? "text-danger" : "text-text-muted"}`}>
              {name.length}/{MAX_NAME_LENGTH}
            </span>
          </label>
        )}

        <FolderField label="Pasta" folders={folders} value={folderId} onChange={setFolderId} />

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
          <button type="submit" disabled={!picked || isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
            {isPending ? "Enviando…" : "Adicionar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
