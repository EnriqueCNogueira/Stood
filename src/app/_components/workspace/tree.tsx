"use client";

import { ChevronRight, Folder } from "lucide-react";
import { type ReactNode, useState } from "react";
import { FileTypeIcon } from "@/app/_components/workspace/file-type-icon";
import { FOCUS } from "@/app/_components/ui";
import type { StoodTreeFile, StoodTreeFolder, StoodTreeNode } from "@/lib/stood/tree";

export const TREE_ROW = "flex h-7.5 w-full min-w-0 items-center gap-2 rounded-sm px-2 text-left text-ui text-text-muted";
export const TREE_ROW_HOVER = "cursor-pointer transition hover:bg-surface-2 hover:text-text";
export const TREE_CHILDREN = "ml-3.5 border-l border-border pl-1.5";

type RenderFile = (file: StoodTreeFile) => ReactNode;

// Pastas e Arquivos de um Stood; Pastas abertas ou fechadas não são salvas
export function TreeList({ nodes, renderFile }: { nodes: StoodTreeNode[]; renderFile: RenderFile }) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>{node.kind === "folder" ? <FolderItem folder={node} renderFile={renderFile} /> : renderFile(node)}</li>
      ))}
    </ul>
  );
}

// Ícone do tipo e nome do Arquivo, sem extensão
export function FileLabel({ file }: { file: StoodTreeFile }) {
  return (
    <>
      <span className="size-3.5 flex-none" />
      <FileTypeIcon type={file.type} />
      <span className="truncate">{file.name}</span>
    </>
  );
}

export function TreeChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <ChevronRight
      size={14}
      aria-hidden
      className={`flex-none text-text-muted transition-transform motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`}
    />
  );
}

function FolderItem({ folder, renderFile }: { folder: StoodTreeFolder; renderFile: RenderFile }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`${TREE_ROW} ${TREE_ROW_HOVER} ${FOCUS}`}
      >
        <TreeChevron isOpen={isOpen} />
        <Folder size={16} strokeWidth={1.75} aria-hidden className="flex-none" />
        <span className="truncate">{folder.name}</span>
      </button>
      {isOpen && (
        <div className={TREE_CHILDREN}>
          {folder.children.length > 0 ? (
            <TreeList nodes={folder.children} renderFile={renderFile} />
          ) : (
            <p className="px-2 py-1 text-ui text-text-muted">Pasta vazia</p>
          )}
        </div>
      )}
    </>
  );
}
