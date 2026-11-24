import type { FileType } from "@/db/schema";
import type { StoodTag } from "@/lib/tag/rules";

// Árvore de Pastas e Arquivos de um Stood, sem I/O: o client também usa estes tipos
export type { FileType };

// videoId só existe no Vídeo: é o que o player da Janela toca
export type StoodTreeFile = { kind: "file"; id: string; name: string; type: FileType; videoId?: string };
export type StoodTreeFolder = { kind: "folder"; id: string; name: string; children: StoodTreeNode[] };
export type StoodTreeNode = StoodTreeFolder | StoodTreeFile;
export type StoodWithTree = {
  id: string;
  name: string;
  description: string | null;
  tags: StoodTag[];
  tree: StoodTreeNode[];
};

type FolderRow = { id: string; name: string; parentId: string | null };
type FileRow = { id: string; name: string; type: FileType; folderId: string | null; videoId?: string | null };

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
      node: {
        kind: "file",
        id: file.id,
        name: file.name,
        type: file.type,
        ...(file.videoId ? { videoId: file.videoId } : {}),
      } as StoodTreeNode,
    })),
  ];
  const childrenByParentId = Map.groupBy(entries, (entry) => entry.parentId);

  for (const folder of folderNodes.values()) {
    folder.children = buildSortedNodes(childrenByParentId.get(folder.id) ?? []);
  }
  return buildSortedNodes(childrenByParentId.get(null) ?? []);
}

// Árvore nova com o Arquivo recém-criado na Pasta pedida (nula é a raiz), na mesma ordem que o servidor montaria
export function buildTreeWithFile(tree: StoodTreeNode[], file: StoodTreeFile, folderId: string | null = null): StoodTreeNode[] {
  return buildTreeAt(tree, folderId, (nodes) => [...nodes, file].sort(compareNodes));
}

export function buildTreeWithFolder(
  tree: StoodTreeNode[],
  folder: { id: string; name: string },
  parentId: string | null,
): StoodTreeNode[] {
  const node: StoodTreeFolder = { kind: "folder", id: folder.id, name: folder.name, children: [] };
  return buildTreeAt(tree, parentId, (nodes) => [...nodes, node].sort(compareNodes));
}

export function buildTreeWithoutFile(tree: StoodTreeNode[], fileId: string): StoodTreeNode[] {
  return tree.flatMap((node): StoodTreeNode[] => {
    if (node.kind === "file") return node.id === fileId ? [] : [node];
    return [{ ...node, children: buildTreeWithoutFile(node.children, fileId) }];
  });
}

// O Arquivo renomeado fica na mesma Pasta e volta para a posição da ordem alfabética
export function buildTreeWithRenamedFile(tree: StoodTreeNode[], fileId: string, name: string): StoodTreeNode[] {
  const hasFile = tree.some((node) => node.kind === "file" && node.id === fileId);
  const nodes = tree.map((node) => {
    if (node.kind === "file") return node.id === fileId ? { ...node, name } : node;
    return { ...node, children: buildTreeWithRenamedFile(node.children, fileId, name) };
  });
  return hasFile ? nodes.sort(compareNodes) : nodes;
}

// Pastas na ordem da árvore, com o caminho a partir da raiz, para o campo "Pasta" dos diálogos
export function buildFolderOptions(tree: StoodTreeNode[], path: string[] = []): { id: string; label: string }[] {
  return tree.flatMap((node) => {
    if (node.kind === "file") return [];
    const nodePath = [...path, node.name];
    return [{ id: node.id, label: nodePath.join(" / ") }, ...buildFolderOptions(node.children, nodePath)];
  });
}

// Todos os Arquivos da árvore, de qualquer Pasta
export function buildTreeFiles(tree: StoodTreeNode[]): StoodTreeFile[] {
  return tree.flatMap((node) => (node.kind === "file" ? [node] : buildTreeFiles(node.children)));
}

export function buildSortedByName<T extends { name: string }>(items: T[]) {
  return items.sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
}

// Aplica a mudança na lista de filhos da Pasta pedida (nula é a raiz), copiando só o caminho até ela
function buildTreeAt(
  tree: StoodTreeNode[],
  folderId: string | null,
  update: (nodes: StoodTreeNode[]) => StoodTreeNode[],
): StoodTreeNode[] {
  if (folderId === null) return update(tree);
  return tree.map((node) => {
    if (node.kind === "file") return node;
    if (node.id === folderId) return { ...node, children: update(node.children) };
    return { ...node, children: buildTreeAt(node.children, folderId, update) };
  });
}

function buildSortedNodes(entries: { node: StoodTreeNode }[]) {
  return entries.map((entry) => entry.node).sort(compareNodes);
}

function compareNodes(a: StoodTreeNode, b: StoodTreeNode) {
  if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
  return NAME_COLLATOR.compare(a.name, b.name);
}
