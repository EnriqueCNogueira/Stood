"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import type { PointerEvent } from "react";
import { ICON_BUTTON } from "@/app/_components/ui";
import { NoteEditor } from "@/app/_components/workspace/board/note-editor";
import { FILE_TYPE_LABELS, FileTypeIcon } from "@/app/_components/workspace/file-type-icon";
import { type BoardFile, type BoardNotes, type BoardWindow as BoardWindowState, isMaximized } from "@/lib/board/windows";
import { buildYouTubeEmbedUrl } from "@/lib/video/link";

const COMPACT_HEIGHTS = { note: "h-110", pdf: "h-110", image: "h-60", video: "h-75", drawing: "h-75" };

type BoardWindowProps = {
  window: BoardWindowState;
  zIndex: number;
  isActive: boolean;
  isCompact: boolean;
  notes: BoardNotes;
  onBarPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onFocus: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

// Janela com barra, botões de maximizar e fechar e canto de redimensionar; Vídeo e Nota funcionam, os outros tipos ainda são placeholder
export function BoardWindow({
  window,
  zIndex,
  isActive,
  isCompact,
  notes,
  onBarPointerDown,
  onResizePointerDown,
  onFocus,
  onToggleMaximize,
  onClose,
}: BoardWindowProps) {
  const { file, rect } = window;
  const maximized = isMaximized(window);
  const position = isCompact ? `relative w-full flex-none ${COMPACT_HEIGHTS[file.type]}` : "absolute";

  return (
    <section
      aria-label={`${FILE_TYPE_LABELS[file.type]}: ${file.name}`}
      onPointerDown={onFocus}
      // Foco por teclado, no texto da Nota ou no player do Vídeo também traz a Janela para a frente
      onFocus={onFocus}
      style={isCompact ? undefined : { left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex }}
      className={`${position} flex flex-col overflow-hidden rounded-lg border bg-surface text-text shadow-card ${
        isActive && !isCompact ? "border-accent/70 ring-3 ring-accent/12" : "border-border"
      }`}
    >
      <header
        onPointerDown={onBarPointerDown}
        onDoubleClick={(event) => {
          if (!isCompact && !isFromButton(event.target)) onToggleMaximize();
        }}
        className={`flex h-9 flex-none touch-none items-center gap-2 border-b border-border bg-surface-2 pl-3 text-ui select-none ${
          maximized ? "pr-12" : "pr-1"
        } ${
          isCompact || maximized ? "" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <FileTypeIcon type={file.type} />
        <span className={`min-w-0 flex-1 truncate ${isActive ? "text-text" : "text-text-muted"}`}>{file.name}</span>
        {!isCompact && (
          <button
            type="button"
            aria-label={maximized ? "Restaurar" : "Maximizar"}
            onClick={onToggleMaximize}
            className={ICON_BUTTON}
          >
            {maximized ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
          </button>
        )}
        <button type="button" aria-label="Fechar" onClick={onClose} className={`${ICON_BUTTON} hover:not-disabled:text-danger`}>
          <X size={16} aria-hidden />
        </button>
      </header>

      <WindowContent file={file} notes={notes} />

      {!isCompact && !maximized && (
        <div
          aria-hidden
          onPointerDown={onResizePointerDown}
          className="absolute right-0 bottom-0 grid size-4 cursor-nwse-resize touch-none place-items-center"
        >
          <span className="size-2 rounded-br-sm border-r-2 border-b-2 border-text-muted/60" />
        </div>
      )}
    </section>
  );
}

// O iframe fica montado enquanto a Janela está aberta: mover, redimensionar e maximizar não param o vídeo
function WindowContent({ file, notes }: { file: BoardFile; notes: BoardNotes }) {
  if (file.type === "note") {
    return (
      <NoteEditor
        fileId={file.id}
        name={file.name}
        initialContent={notes.getContent(file.id)}
        onContentChange={(content) => notes.setContent(file.id, content)}
      />
    );
  }
  if (file.type === "video" && file.videoId) {
    return (
      <iframe
        src={buildYouTubeEmbedUrl(file.videoId)}
        title={file.name}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        // O YouTube recusa o player sem a origem do site que o incorpora
        referrerPolicy="strict-origin-when-cross-origin"
        className="min-h-0 w-full flex-1 bg-bg"
      />
    );
  }

  return (
    <div className="grid min-h-0 flex-1 place-content-center justify-items-center gap-2 p-4 text-center">
      <FileTypeIcon type={file.type} size={32} />
      <strong className="max-w-full truncate font-medium">{file.name}</strong>
      <span className="font-mono text-meta text-text-muted">{FILE_TYPE_LABELS[file.type]}</span>
    </div>
  );
}

export function isFromButton(target: EventTarget) {
  return target instanceof Element && target.closest("button") !== null;
}
