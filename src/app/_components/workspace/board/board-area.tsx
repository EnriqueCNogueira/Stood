"use client";

import type { CSSProperties, PointerEvent, RefObject } from "react";
import { BoardWindow } from "@/app/_components/workspace/board/board-window";
import { type BoardPreferences, SPACING_PIXELS } from "@/lib/board/preferences";
import { type BoardState, type Rect, findFrontWindow } from "@/lib/board/windows";

const BACKGROUND_CLASSES = { clean: "", grid: "board-grid", dots: "board-dots" };

// Fica acima de todas as Janelas, que vão de 1 a 10
const OUTLINE_Z_INDEX = 20;

type BoardAreaProps = {
  areaRef: RefObject<HTMLDivElement | null>;
  state: BoardState;
  preferences: BoardPreferences;
  outline: Rect | null;
  isCompact: boolean;
  onBarPointerDown: (fileId: string, event: PointerEvent<HTMLElement>) => void;
  onResizePointerDown: (fileId: string, event: PointerEvent<HTMLElement>) => void;
  onFocus: (fileId: string) => void;
  onToggleMaximize: (fileId: string) => void;
  onClose: (fileId: string) => void;
};

// Área do Quadro com o fundo e o tema da engrenagem; no celular, as Janelas ficam em coluna
export function BoardArea({ areaRef, state, preferences, outline, isCompact, ...handlers }: BoardAreaProps) {
  const theme = preferences.theme === "site" ? undefined : preferences.theme;
  const front = findFrontWindow(state);
  // O HTML segue a ordem de abertura e a frente sai do z-index, de 1 a 10: mover o nó no meio do clique perderia o clique duplo
  const stackOrder = [...state.windows].sort((a, b) => a.z - b.z);

  return (
    <div
      ref={areaRef}
      aria-label="Quadro"
      data-theme={theme}
      style={{ "--board-spacing": `${SPACING_PIXELS[preferences.spacing]}px` } as CSSProperties}
      className={`relative isolate min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-bg text-text shadow-card ${BACKGROUND_CLASSES[preferences.background]} ${
        isCompact ? "flex min-h-96 flex-col gap-3 p-3 pt-12" : ""
      }`}
    >
      {state.windows.length === 0 && (
        <p className="pointer-events-none absolute inset-0 grid place-content-center px-6 text-center text-ui text-text-muted">
          {isCompact
            ? "Abra a barra lateral e toque duas vezes num Arquivo para abrir uma Janela."
            : "Arraste um Arquivo da barra lateral ou clique duas vezes nele para abrir uma Janela."}
        </p>
      )}

      {state.windows.map((window) => (
        <BoardWindow
          key={window.file.id}
          window={window}
          zIndex={stackOrder.indexOf(window) + 1}
          isActive={window === front}
          isCompact={isCompact}
          onBarPointerDown={(event) => handlers.onBarPointerDown(window.file.id, event)}
          onResizePointerDown={(event) => handlers.onResizePointerDown(window.file.id, event)}
          onFocus={() => handlers.onFocus(window.file.id)}
          onToggleMaximize={() => handlers.onToggleMaximize(window.file.id)}
          onClose={() => handlers.onClose(window.file.id)}
        />
      ))}

      {outline && (
        <div
          aria-hidden
          style={{ left: outline.x, top: outline.y, width: outline.width, height: outline.height, zIndex: OUTLINE_Z_INDEX }}
          className="pointer-events-none absolute rounded-lg border-2 border-dashed border-accent bg-accent/5"
        />
      )}
    </div>
  );
}
