"use client";

import { useState } from "react";
import { useAutosave } from "@/app/_components/workspace/board/autosave";
import { type UpdateNoteContentActionResult, updateNoteContentAction } from "@/app/_components/workspace/board/file-actions";
import { MAX_NOTE_LENGTH } from "@/lib/file/note";

// Espera o Usuário parar de digitar antes de salvar
const SAVE_DELAY_MS = 800;
const RETRY_MESSAGE = "Não foi possível salvar. A próxima edição tenta de novo.";

type SaveFailure = Exclude<UpdateNoteContentActionResult, { ok: true }>["reason"] | "inesperado";

const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  "nota-longa": `A Nota passou de ${MAX_NOTE_LENGTH.toLocaleString("pt-BR")} caracteres e não foi salva.`,
  "nota-nao-encontrada": "Esta Nota não existe mais e não foi salva.",
  "entrada-invalida": RETRY_MESSAGE,
  inesperado: RETRY_MESSAGE,
};

type NoteEditorProps = {
  fileId: string;
  name: string;
  initialContent: string;
  onContentChange: (content: string) => void;
};

// Bloco de notas da Janela: o texto rola dentro dela, que só muda de tamanho pelo canto, e salva sozinho
export function NoteEditor({ fileId, name, initialContent, onContentChange }: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const { status, schedule } = useAutosave(initialContent, (pending: string) => updateNoteContentAction({ fileId, content: pending }), {
    delayMs: SAVE_DELAY_MS,
    warnOnLeave: true,
  });

  function changeContent(next: string) {
    setContent(next);
    onContentChange(next);
    schedule(next);
  }

  return (
    <>
      <textarea
        value={content}
        onChange={(event) => changeContent(event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        aria-label={`Texto da Nota ${name}`}
        placeholder="Escreva aqui…"
        className="min-h-0 w-full flex-1 resize-none overflow-y-auto bg-surface px-4 py-3 text-sm leading-relaxed text-text placeholder:text-text-muted focus:outline-none 2xl:text-base"
      />
      <p
        role="status"
        className={`flex h-6 flex-none items-center truncate border-t border-border px-3 font-mono text-meta ${
          status.kind === "error" ? "text-danger" : "text-text-muted"
        }`}
      >
        {status.kind === "error" ? FAILURE_MESSAGES[status.reason] : status.kind === "saving" ? "Salvando…" : "Salvo"}
      </p>
    </>
  );
}
