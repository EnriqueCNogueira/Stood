import type { FileType } from "@/db/schema";

// Árvore de Pastas e Arquivos de um Stood, sem I/O: o client também usa estes tipos
export type { FileType };

export type StoodTreeFile = { kind: "file"; id: string; name: string; type: FileType };
export type StoodTreeFolder = { kind: "folder"; id: string; name: string; children: StoodTreeNode[] };
export type StoodTreeNode = StoodTreeFolder | StoodTreeFile;
export type StoodWithTree = { id: string; name: string; description: string | null; tree: StoodTreeNode[] };

type FolderRow = { id: string; name: string; parentId: string | null };
type FileRow = { id: string; name: string; type: FileType; folderId: string | null };

const NAME_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

// Monta a árvore aninhada a partir das linhas planas: Pastas antes dos Arquivos, cada grupo em ordem alfabética
export function buildStoodTree(folderRows: FolderRow[], fileRows: FileRow[]): StoodTreeNode[] {
  const folderNodes = new Map(
    folderRows.map((folder): [string, StoodTreeFolder] => [folder.id, { kind: "folder", id: folder.id, name: folder.name, children: [] }]),
  );
  const entries = [
    ...folderRows.map((folder) => ({ parentId: folder.parentId, node: folderNodes.get(folder.id) as StoodTreeNode })),
    ...fileRows.map((file) => ({
      parentId: file.folderId,
      node: { kind: "file", id: file.id, name: file.name, type: file.type } as StoodTreeNode,
    })),
  ];
  const childrenByParentId = Map.groupBy(entries, (entry) => entry.parentId);

  for (const folder of folderNodes.values()) {
    folder.children = buildSortedNodes(childrenByParentId.get(folder.id) ?? []);
  }
  return buildSortedNodes(childrenByParentId.get(null) ?? []);
}

export function buildSortedByName<T extends { name: string }>(items: T[]) {
  return items.sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
}

function buildSortedNodes(entries: { node: StoodTreeNode }[]) {
  return entries
    .map((entry) => entry.node)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return NAME_COLLATOR.compare(a.name, b.name);
    });
}
