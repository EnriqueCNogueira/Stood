"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { useStoredValue } from "@/app/_components/workspace/local-storage";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, buildSidebarWidth, parseSidebarWidth } from "@/lib/board/preferences";

const KEYBOARD_STEP = 16;

type SidebarProps = {
  label: string;
  widthStorageKey: string;
  defaultWidth: number;
  className?: string;
  children: ReactNode;
};

// Barra lateral da Biblioteca: a alça da borda direita muda a largura, salva no navegador, a partir de md.
// Quem usa só diz a posição de fora (sticky, fixed, gaveta); o invólucro de dentro ancora a alça.
export function Sidebar({ label, widthStorageKey, defaultWidth, className = "", children }: SidebarProps) {
  const [stored, setStored] = useStoredValue(widthStorageKey);
  const [draggedWidth, setDraggedWidth] = useState<number | null>(null);
  const dragStart = useRef<{ pointerX: number; width: number } | null>(null);
  const width = draggedWidth ?? parseSidebarWidth(stored, defaultWidth);

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, width };
  }

  function resize(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setDraggedWidth(buildSidebarWidth(dragStart.current.width + event.clientX - dragStart.current.pointerX));
  }

  function finishResize() {
    if (!dragStart.current) return;
    dragStart.current = null;
    if (draggedWidth !== null) setStored(String(draggedWidth));
    setDraggedWidth(null);
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -KEYBOARD_STEP, ArrowRight: KEYBOARD_STEP }[event.key];
    if (!step) return;
    event.preventDefault();
    setStored(String(buildSidebarWidth(width + step)));
  }

  return (
    <aside
      aria-label={label}
      style={{ "--sidebar-width": `${width}px` } as CSSProperties}
      className={`flex flex-col border-border bg-surface md:w-(--sidebar-width) md:flex-none md:border-r ${className}`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {children}
        <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Largura da barra lateral"
        aria-valuenow={width}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        tabIndex={0}
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onKeyDown={resizeWithKeyboard}
        className="absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize touch-none transition hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none md:block"
        />
      </div>
    </aside>
  );
}
