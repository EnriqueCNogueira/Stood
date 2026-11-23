import type { FileType } from "@/db/schema";
import type { StoodTreeNode } from "@/lib/stood/tree";

// Regras da exportação do Stood sem I/O: o Quadro monta o .zip no navegador com o que já tem carregado

// Vídeo e PDF não são exportados; a ordem é a dos checks do modal
export const EXPORT_TYPES = ["note", "drawing", "image"] as const satisfies FileType[];
export type ExportType = (typeof EXPORT_TYPES)[number];
export type ExportTypeCount = { type: ExportType; count: number };
export type ExportEntry = { fileId: string; type: ExportType; path: string };

const EXTENSIONS: Record<ExportType, string> = { note: "txt", drawing: "pdf", image: "jpg" };
// O que o Windows não aceita em nome de arquivo; / e \ o nome do Stood já recusa
const INVALID_PATH_CHARACTERS = /[<>:"|?*\u0000-\u001f]/g;
// O Windows descarta ponto e espaço do fim do nome, e dois caminhos diferentes viram o mesmo
const TRAILING_DOTS_AND_SPACES = /[. ]+$/;
const FALLBACK_NAME = "Arquivo";

// Quantos Arquivos de cada tipo exportável o Stood tem, em todas as Pastas; o tipo sem Arquivo fica de fora
export function buildExportTypeCounts(tree: StoodTreeNode[]): ExportTypeCount[] {
  const entries = buildExportEntries(tree, EXPORT_TYPES);
  return EXPORT_TYPES.map((type) => ({ type, count: entries.filter((entry) => entry.type === type).length })).filter(
    (typeCount) => typeCount.count > 0,
  );
}

// Caminho de cada Arquivo dentro do .zip, com as Pastas do Stood; o caminho repetido ganha um número
export function buildExportEntries(tree: StoodTreeNode[], types: readonly ExportType[]): ExportEntry[] {
  const selected = new Set<FileType>(types);
  const usedPaths = new Set<string>();
  const entries: ExportEntry[] = [];

  function visit(nodes: StoodTreeNode[], folderPath: string) {
    for (const node of nodes) {
      if (node.kind === "folder") {
        visit(node.children, `${folderPath}${buildSafeName(node.name)}/`);
        continue;
      }
      if (!selected.has(node.type)) continue;
      const type = node.type as ExportType;
      const path = buildUniquePath(`${folderPath}${buildSafeName(node.name)}`, EXTENSIONS[type], usedPaths);
      entries.push({ fileId: node.id, type, path });
    }
  }

  visit(tree, "");
  return entries;
}

export function buildExportZipName(stoodName: string) {
  return `${buildSafeName(stoodName)}.zip`;
}

function buildSafeName(name: string) {
  return name.replace(INVALID_PATH_CHARACTERS, "-").replace(TRAILING_DOTS_AND_SPACES, "") || FALLBACK_NAME;
}

// O Windows e o macOS não diferenciam maiúscula, então "Aula.txt" e "aula.txt" colidem ao extrair
function buildUniquePath(basePath: string, extension: string, usedPaths: Set<string>) {
  let path = `${basePath}.${extension}`;
  for (let copy = 2; usedPaths.has(path.toLowerCase()); copy++) path = `${basePath} (${copy}).${extension}`;
  usedPaths.add(path.toLowerCase());
  return path;
}
