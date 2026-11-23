"use client";

import { ChevronRight, Pencil, Tags, Trash2, X } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, DIALOG, FIELD, FIELD_LABEL, FOCUS, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import { type PickerStood, TagStoodsPicker } from "@/app/_components/workspace/library/tag-stoods-picker";
import {
  createTagAction,
  deleteTagAction,
  updateTagNameAction,
  updateTagStoodsAction,
} from "@/app/_components/workspace/tag-actions";
import { TAG_REASON_MESSAGES } from "@/app/_components/workspace/tag-messages";
import { MAX_TAG_NAME_LENGTH } from "@/lib/tag/rules";

type ManagedTag = { id: string; name: string; stoodCount: number };

// O que a linha da Tag está fazendo: só mostrando, escolhendo os Stoods, editando o nome ou pedindo confirmação para apagar
type RowMode = { tagId: string; kind: "stoods" | "rename" | "confirm-delete" } | null;

type ManageTagsDialogProps = { tags: ManagedTag[]; stoods: PickerStood[] };

// "Gerenciar Tags" da Biblioteca: criar, renomear, apagar e escolher os Stoods de cada Tag; a lista vem da página, que a Action revalida
export function ManageTagsDialog({ tags, stoods }: ManageTagsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const newNameId = useId();
  const [newName, setNewName] = useState("");
  const [rowMode, setRowMode] = useState<RowMode>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setNewName("");
    setRowMode(null);
    setMessage(null);
    dialogRef.current?.showModal();
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runAction(async () => {
      const result = await createTagAction({ name: newName });
      if (!result.ok) return result.reason;
      setNewName("");
      return null;
    });
  }

  function startRename(tag: ManagedTag) {
    setDraft(tag.name);
    setMessage(null);
    setRowMode({ tagId: tag.id, kind: "rename" });
  }

  function rename(tagId: string) {
    runAction(async () => {
      const result = await updateTagNameAction({ tagId, name: draft });
      if (!result.ok) return result.reason;
      setRowMode(null);
      return null;
    });
  }

  // Clicar de novo na Tag aberta fecha a lista sem salvar
  function toggleStoods(tagId: string) {
    setMessage(null);
    setRowMode((current) => (current?.tagId === tagId && current.kind === "stoods" ? null : { tagId, kind: "stoods" }));
  }

  function saveStoods(tagId: string, stoodIds: string[]) {
    runAction(async () => {
      const result = await updateTagStoodsAction({ tagId, stoodIds });
      if (!result.ok) return result.reason;
      setRowMode(null);
      return null;
    });
  }

  // Sem Stood marcado, não há o que perder: apaga direto
  function requestDelete(tag: ManagedTag) {
    setMessage(null);
    if (tag.stoodCount > 0) setRowMode({ tagId: tag.id, kind: "confirm-delete" });
    else remove(tag.id);
  }

  function remove(tagId: string) {
    runAction(async () => {
      const result = await deleteTagAction({ tagId });
      if (!result.ok) return result.reason;
      setRowMode(null);
      return null;
    });
  }

  // Cada ação devolve o motivo da recusa, ou nulo quando deu certo
  function runAction(action: () => Promise<keyof typeof TAG_REASON_MESSAGES | null>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const reason = await action();
        if (reason) setMessage(TAG_REASON_MESSAGES[reason]);
      } catch {
        setMessage(TAG_REASON_MESSAGES.inesperado);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={open} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.ghost} w-full justify-start`}>
        <Tags size={14} aria-hidden />
        Gerenciar Tags
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className={DIALOG}
      >
        <div className="grid w-md max-w-full gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-medium tracking-tight">
              Gerenciar Tags
            </h2>
            <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
              <X size={16} aria-hidden />
            </button>
          </div>

          <form onSubmit={create} noValidate className="flex items-end gap-2">
            <div className={`${FIELD} min-w-0 flex-1`}>
              <label htmlFor={newNameId} className={FIELD_LABEL}>
                Nova Tag
              </label>
              <input
                id={newNameId}
                value={newName}
                autoComplete="off"
                aria-describedby={`${newNameId}-hint`}
                placeholder="Prova, Exatas, Semestre 1..."
                onChange={(event) => setNewName(event.target.value)}
                className={INPUT}
              />
              <span id={`${newNameId}-hint`} className="text-meta text-text-muted">
                Até {MAX_TAG_NAME_LENGTH} caracteres
              </span>
            </div>
            <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary} mb-5.5`}>
              Criar Tag
            </button>
          </form>

          {message && <FormMessage tone="error">{message}</FormMessage>}

          {tags.length > 0 ? (
            <ul aria-label="Suas Tags" className="grid max-h-80 gap-1 overflow-y-auto">
              {tags.map((tag) => (
                <li key={tag.id} className="rounded-md px-2 py-1.5 hover:bg-surface-2">
                  {rowMode?.tagId === tag.id && rowMode.kind === "rename" ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        rename(tag.id);
                      }}
                      noValidate
                      className="flex items-center gap-2"
                    >
                      <input
                        aria-label={`Novo nome da Tag ${tag.name}`}
                        value={draft}
                        autoFocus
                        autoComplete="off"
                        onChange={(event) => setDraft(event.target.value)}
                        className={`${INPUT} h-8 min-w-0 flex-1`}
                      />
                      <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.primary}`}>
                        Salvar
                      </button>
                      <button type="button" onClick={() => setRowMode(null)} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.ghost}`}>
                        Cancelar
                      </button>
                    </form>
                  ) : rowMode?.tagId === tag.id && rowMode.kind === "confirm-delete" ? (
                    <div className="grid gap-2">
                      <p className="text-ui" role="status">
                        A Tag <strong className="font-medium">{tag.name}</strong> marca {buildStoodCountLabel(tag.stoodCount)}. Apagar mesmo
                        assim? Os Stoods continuam existindo.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setRowMode(null)} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => remove(tag.id)}
                          className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.danger}`}
                        >
                          Apagar Tag
                        </button>
                      </div>
                    </div>
                  ) : (
                    <TagRow
                      tag={tag}
                      isOpen={rowMode?.tagId === tag.id && rowMode.kind === "stoods"}
                      isPending={isPending}
                      onToggle={() => toggleStoods(tag.id)}
                      onRename={() => startRename(tag)}
                      onDelete={() => requestDelete(tag)}
                    >
                      <TagStoodsPicker
                        tagId={tag.id}
                        tagName={tag.name}
                        stoods={stoods}
                        isPending={isPending}
                        onSave={(stoodIds) => saveStoods(tag.id, stoodIds)}
                        onCancel={() => setRowMode(null)}
                      />
                    </TagRow>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ui text-text-muted">Você ainda não tem Tags. Crie a primeira acima ou no diálogo de um Stood.</p>
          )}
        </div>
      </dialog>
    </>
  );
}

type TagRowProps = {
  tag: ManagedTag;
  isOpen: boolean;
  isPending: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  children: ReactNode;
};

// Linha da Tag: o nome abre e fecha a lista de Stoods (children); os ícones renomeiam e apagam
function TagRow({ tag, isOpen, isPending, onToggle, onRename, onDelete, children }: TagRowProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm text-left text-ui ${FOCUS}`}
        >
          <ChevronRight
            size={14}
            aria-hidden
            className={`flex-none text-text-muted transition-transform motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`}
          />
          <span className="truncate">{tag.name}</span>
          <span className="sr-only">: escolher os Stoods</span>
        </button>
        <span className="flex-none font-mono text-meta text-text-muted">{buildStoodCountLabel(tag.stoodCount)}</span>
        <button type="button" aria-label={`Renomear a Tag ${tag.name}`} onClick={onRename} className={ICON_BUTTON}>
          <Pencil size={14} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Apagar a Tag ${tag.name}`}
          disabled={isPending}
          onClick={onDelete}
          className={`${ICON_BUTTON} hover:not-disabled:text-danger`}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
      {isOpen && children}
    </div>
  );
}

function buildStoodCountLabel(count: number) {
  return count === 1 ? "1 Stood" : `${count} Stoods`;
}
