"use client";

import { ArrowLeft, ChevronDown, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useCallback, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { BUTTON, FOCUS, ICON_BUTTON, MENU_ITEM, POPOVER } from "@/app/_components/ui";
import { FILE_TYPE_LABELS, FILE_TYPE_ORDER, FileTypeIcon } from "@/app/_components/workspace/file-type-icon";
import { Sidebar } from "@/app/_components/workspace/sidebar";
import { FileLabel, TREE_ROW, TREE_ROW_HOVER, TreeList } from "@/app/_components/workspace/tree";
import { SIDEBAR_WIDTH_STORAGE_KEYS } from "@/lib/board/preferences";
import type { StoodTreeFile, StoodTreeNode } from "@/lib/stood/tree";

const DEFAULT_WIDTH = 248;

type BoardSidebarProps = {
  tree: StoodTreeNode[];
  isCollapsed: boolean;
  isDrawerOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseDrawer: () => void;
  onFilePointerDown: (file: StoodTreeFile, event: PointerEvent<HTMLElement>) => void;
  onOpenFile: (file: StoodTreeFile) => void;
};

// Barra lateral do Quadro: recolhe no computador e vira gaveta no celular
export function BoardSidebar({
  tree,
  isCollapsed,
  isDrawerOpen,
  onToggleCollapsed,
  onCloseDrawer,
  onFilePointerDown,
  onOpenFile,
}: BoardSidebarProps) {
  function openWithKeyboard(file: StoodTreeFile, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenFile(file);
  }

  return (
    <>
      {isCollapsed && (
        <div className="hidden flex-none border-r border-border bg-surface p-1.5 md:block">
          <button type="button" aria-label="Abrir a barra lateral" onClick={onToggleCollapsed} className={ICON_BUTTON}>
            <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      )}

      {isDrawerOpen && <div aria-hidden onClick={onCloseDrawer} className="fixed inset-x-0 top-14 bottom-0 z-30 bg-bg/70 md:hidden" />}

      <Sidebar
        label="Arquivos do Stood"
        widthStorageKey={SIDEBAR_WIDTH_STORAGE_KEYS.board}
        defaultWidth={DEFAULT_WIDTH}
        className={`fixed top-14 bottom-0 left-0 z-40 w-72 border-r transition-transform motion-reduce:transition-none md:static md:z-auto md:transition-none ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${isCollapsed ? "md:hidden" : ""}`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
          {/* <a> e não <Link>: sem prefetch, como nas outras telas */}
          <a href="/biblioteca" className={`inline-flex items-center gap-1 self-start px-1 text-ui text-accent-text underline underline-offset-2 hover:decoration-2 2xl:text-sm ${FOCUS}`}>
            <ArrowLeft size={14} aria-hidden />
            Voltar
          </a>
          <div className="flex items-center gap-1">
            <NewFileMenu />
            <button type="button" aria-label="Recolher a barra lateral" onClick={onToggleCollapsed} className={`${ICON_BUTTON} hidden md:inline-flex`}>
              <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div>
            <p id="board-files" className="mb-1 px-2 text-xs font-medium text-text-muted">
              Arquivos
            </p>
            <p className="mb-2 px-2 text-xs text-text-muted">
              <span className="hidden md:inline">Arraste para o Quadro ou clique duas vezes.</span>
              <span className="md:hidden">Toque duas vezes para abrir.</span>
            </p>
            {tree.length > 0 ? (
              <TreeList
                nodes={tree}
                renderFile={(file) => (
                  <button
                    type="button"
                    onPointerDown={(event) => onFilePointerDown(file, event)}
                    onDoubleClick={() => onOpenFile(file)}
                    onKeyDown={(event) => openWithKeyboard(file, event)}
                    className={`${TREE_ROW} ${TREE_ROW_HOVER} select-none md:cursor-grab md:touch-none ${FOCUS}`}
                  >
                    <FileLabel file={file} />
                  </button>
                )}
              />
            ) : (
              <p className="px-2 text-ui text-text-muted">Este Stood ainda não tem Arquivos.</p>
            )}
          </div>
        </div>
      </Sidebar>
    </>
  );
}

// Os 5 tipos aparecem desabilitados até a etapa de cada um
function NewFileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary} w-full`}
      >
        <Plus size={16} aria-hidden />
        Novo Arquivo
        <ChevronDown size={14} aria-hidden />
      </button>
      {isOpen && (
        <div role="menu" aria-label="Novo Arquivo" className={`absolute top-11 right-0 left-0 z-10 p-1 ${POPOVER}`}>
          {FILE_TYPE_ORDER.map((type) => (
            <button key={type} type="button" role="menuitem" disabled className={`${MENU_ITEM} gap-2`}>
              <FileTypeIcon type={type} className="opacity-45" />
              {FILE_TYPE_LABELS[type]}
            </button>
          ))}
          <p className="px-2.5 pt-1 pb-1.5 text-xs text-text-muted">Chega nas próximas versões.</p>
        </div>
      )}
    </div>
  );
}
