"use client";

import { ArrowLeft, ChevronDown, FolderPlus, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useCallback, useMemo, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { BUTTON, FOCUS, ICON_BUTTON, MENU_ITEM, MENU_SEPARATOR, POPOVER } from "@/app/_components/ui";
import { FILE_TYPE_LABELS, FILE_TYPE_ORDER, FileTypeIcon } from "@/app/_components/workspace/file-type-icon";
import { FileRowMenu } from "@/app/_components/workspace/board/file-row-menu";
import type { FolderOption } from "@/app/_components/workspace/board/folder-field";
import { ImageDialog } from "@/app/_components/workspace/board/image-dialog";
import { NamedFileDialog } from "@/app/_components/workspace/board/named-file-dialog";
import { VideoDialog } from "@/app/_components/workspace/board/video-dialog";
import { Sidebar } from "@/app/_components/workspace/sidebar";
import { FileLabel, TREE_ROW, TREE_ROW_HOVER, TreeList } from "@/app/_components/workspace/tree";
import { SIDEBAR_WIDTH_STORAGE_KEYS } from "@/lib/board/preferences";
import { type FileType, type StoodTreeFile, type StoodTreeNode, buildFolderOptions } from "@/lib/stood/tree";

const DEFAULT_WIDTH = 248;

type BoardSidebarProps = {
  stoodId: string;
  tree: StoodTreeNode[];
  isCollapsed: boolean;
  isDrawerOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseDrawer: () => void;
  onFilePointerDown: (file: StoodTreeFile, event: PointerEvent<HTMLElement>) => void;
  onOpenFile: (file: StoodTreeFile) => void;
  // folderId nulo é a raiz do Stood; a Pasta nova também chega por aqui
  onNodeCreated: (node: StoodTreeNode, folderId: string | null) => void;
  onFileRenamed: (fileId: string, name: string) => void;
  onFileDeleted: (fileId: string) => void;
};

// Barra lateral do Quadro: recolhe no computador e vira gaveta no celular
export function BoardSidebar({
  stoodId,
  tree,
  isCollapsed,
  isDrawerOpen,
  onToggleCollapsed,
  onCloseDrawer,
  onFilePointerDown,
  onOpenFile,
  onNodeCreated,
  onFileRenamed,
  onFileDeleted,
}: BoardSidebarProps) {
  const folders = useMemo(() => buildFolderOptions(tree), [tree]);

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
            <NewFileMenu stoodId={stoodId} folders={folders} onNodeCreated={onNodeCreated} />
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
                  <div className="group flex min-w-0 items-center">
                    <button
                      type="button"
                      onPointerDown={(event) => onFilePointerDown(file, event)}
                      onDoubleClick={() => onOpenFile(file)}
                      onKeyDown={(event) => openWithKeyboard(file, event)}
                      className={`${TREE_ROW} ${TREE_ROW_HOVER} min-w-0 flex-1 select-none md:cursor-grab md:touch-none ${FOCUS}`}
                    >
                      <FileLabel file={file} />
                    </button>
                    <FileRowMenu file={file} onRenamed={onFileRenamed} onDeleted={onFileDeleted} />
                  </div>
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

type NewFileMenuProps = {
  stoodId: string;
  folders: FolderOption[];
  onNodeCreated: BoardSidebarProps["onNodeCreated"];
};

function NewFileMenu({ stoodId, folders, onNodeCreated }: NewFileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogType, setDialogType] = useState<FileType | "folder" | null>(null);
  const closeDialog = useCallback(() => setDialogType(null), []);
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
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setDialogType(type);
              }}
              className={`${MENU_ITEM} cursor-pointer gap-2 hover:bg-surface-2 ${FOCUS}`}
            >
              <FileTypeIcon type={type} />
              {FILE_TYPE_LABELS[type]}
            </button>
          ))}
          <div role="separator" className={MENU_SEPARATOR} />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setDialogType("folder");
            }}
            className={`${MENU_ITEM} cursor-pointer gap-2 hover:bg-surface-2 ${FOCUS}`}
          >
            <FolderPlus size={16} strokeWidth={1.75} aria-hidden className="text-text-muted" />
            Pasta
          </button>
        </div>
      )}
      {/* Fora do menu, que desmonta ao fechar */}
      {dialogType === "video" && <VideoDialog stoodId={stoodId} folders={folders} onAdded={onNodeCreated} onClose={closeDialog} />}
      {(dialogType === "note" || dialogType === "drawing" || dialogType === "folder") && (
        <NamedFileDialog type={dialogType} stoodId={stoodId} folders={folders} onAdded={onNodeCreated} onClose={closeDialog} />
      )}
      {dialogType === "image" && <ImageDialog stoodId={stoodId} folders={folders} onAdded={onNodeCreated} onClose={closeDialog} />}
    </div>
  );
}
