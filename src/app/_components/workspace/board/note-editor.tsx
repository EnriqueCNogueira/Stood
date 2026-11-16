"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type UpdateNoteContentActionResult, updateNoteContentAction } from "@/app/_components/workspace/board/file-actions";
import { MAX_NOTE_LENGTH } from "@/lib/file/note";

// Espera o Usuário parar de digitar antes de salvar
const SAVE_DELAY_MS = 800;

type SaveFailure = Exclude<UpdateNoteContentActionResult, { ok: true }>["reason"] | "inesperado";
type SaveStatus = { kind: "saved" } | { kind: "saving" } | { kind: "error"; reason: SaveFailure };

const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  "nota-longa": `A Nota passou de ${MAX_NOTE_LENGTH.toLocaleString("pt-BR")} caracteres e não foi salva.`,
  "nota-nao-encontrada": "Esta Nota não existe mais e não foi salva.",
  "entrada-invalida": "Não foi possível salvar. A próxima edição tenta de novo.",
  inesperado: "Não foi possível salvar. A próxima edição tenta de novo.",
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
  const [status, setStatus] = useState<SaveStatus>({ kind: "saved" });
  const latestRef = useRef(initialContent);
  const savedRef = useRef(initialContent);
  const isSavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Um salvamento por vez, sempre com o texto mais novo: uma resposta atrasada nunca grava por cima de outra mais nova
  const save = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      while (latestRef.current !== savedRef.current) {
        const pending = latestRef.current;
        setStatus({ kind: "saving" });
        const result = await updateNoteContentAction({ fileId, content: pending }).catch(
          (): { ok: false; reason: "inesperado" } => ({ ok: false, reason: "inesperado" }),
        );
        if (!result.ok) {
          setStatus({ kind: "error", reason: result.reason });
          return;
        }
        savedRef.current = pending;
      }
      setStatus({ kind: "saved" });
    } finally {
      isSavingRef.current = false;
    }
  }, [fileId]);

  // Fechar a Janela ou esconder a aba salva o que falta; sair da página com texto pendente pede confirmação
  useEffect(() => {
    function saveWhenHidden() {
      if (document.visibilityState === "hidden") void save();
    }
    function warnUnsaved(event: BeforeUnloadEvent) {
      if (latestRef.current !== savedRef.current) event.preventDefault();
    }
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("beforeunload", warnUnsaved);
    return () => {
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("beforeunload", warnUnsaved);
      void save();
    };
  }, [save]);

  function changeContent(next: string) {
    setContent(next);
    latestRef.current = next;
    onContentChange(next);
    setStatus({ kind: "saving" });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), SAVE_DELAY_MS);
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
