import { describe, expect, it } from "vitest";
import {
  type StoodTreeFile,
  buildFolderOptions,
  buildStoodTree,
  buildTreeFiles,
  buildTreeWithFile,
  buildTreeWithFolder,
  buildTreeWithRenamedFile,
  buildTreeWithoutFile,
} from "@/lib/stood/tree";

// Aulas > Semana 1 com uma aula, e um Resumo na raiz
const TREE = buildStoodTree(
  [
    { id: "aulas", name: "Aulas", parentId: null },
    { id: "semana-1", name: "Semana 1", parentId: "aulas" },
  ],
  [
    { id: "resumo", name: "Resumo", type: "note", folderId: null },
    { id: "aula-1", name: "Aula 1", type: "video", folderId: "semana-1" },
  ],
);

describe("buildTreeWithFile", () => {
  it("põe o Arquivo novo na raiz, depois das Pastas e em ordem alfabética", () => {
    const tree = buildStoodTree(
      [{ id: "folder-1", name: "Aulas", parentId: null }],
      [
        { id: "file-1", name: "Anotações", type: "note", folderId: null },
        { id: "file-2", name: "Resumo", type: "note", folderId: null },
      ],
    );
    const file: StoodTreeFile = { kind: "file", id: "file-3", name: "Limites", type: "video" };

    expect(buildTreeWithFile(tree, file).map((node) => node.name)).toEqual(["Aulas", "Anotações", "Limites", "Resumo"]);
  });

  it("não altera a árvore recebida", () => {
    const tree = buildStoodTree([], [{ id: "file-1", name: "Resumo", type: "note", folderId: null }]);

    buildTreeWithFile(tree, { kind: "file", id: "file-2", name: "Limites", type: "video" });

    expect(tree.map((node) => node.name)).toEqual(["Resumo"]);
  });

  it("põe o Arquivo novo dentro da Pasta pedida, mesmo aninhada", () => {
    const file: StoodTreeFile = { kind: "file", id: "aula-0", name: "Aula 0", type: "video" };

    const tree = buildTreeWithFile(TREE, file, "semana-1");

    expect(buildTreeFiles(tree).map((treeFile) => treeFile.id)).toEqual(["aula-0", "aula-1", "resumo"]);
  });
});

describe("buildTreeWithFolder", () => {
  it("põe a Pasta nova na raiz, antes dos Arquivos e em ordem alfabética", () => {
    const tree = buildTreeWithFolder(TREE, { id: "listas", name: "Listas" }, null);

    expect(tree.map((node) => node.name)).toEqual(["Aulas", "Listas", "Resumo"]);
  });

  it("põe a Pasta nova dentro da Pasta pedida", () => {
    const tree = buildTreeWithFolder(TREE, { id: "semana-2", name: "Semana 2" }, "aulas");

    expect(buildFolderOptions(tree).map((option) => option.label)).toEqual(["Aulas", "Aulas / Semana 1", "Aulas / Semana 2"]);
  });
});

describe("buildTreeWithoutFile", () => {
  it("tira o Arquivo de qualquer Pasta e mantém o resto", () => {
    const tree = buildTreeWithoutFile(TREE, "aula-1");

    expect([buildTreeFiles(tree).map((file) => file.id), buildFolderOptions(tree).length]).toEqual([["resumo"], 2]);
  });
});

describe("buildTreeWithRenamedFile", () => {
  it("troca o nome e reordena o Arquivo dentro da Pasta dele", () => {
    const tree = buildTreeWithFile(TREE, { kind: "file", id: "mapa", name: "Mapa", type: "drawing" });

    const renamed = buildTreeWithRenamedFile(tree, "mapa", "Diagrama");

    expect(renamed.map((node) => node.name)).toEqual(["Aulas", "Diagrama", "Resumo"]);
  });
});

describe("buildFolderOptions", () => {
  it("lista as Pastas na ordem da árvore, com o caminho a partir da raiz", () => {
    expect(buildFolderOptions(TREE)).toEqual([
      { id: "aulas", label: "Aulas" },
      { id: "semana-1", label: "Aulas / Semana 1" },
    ]);
  });
});

describe("buildTreeFiles", () => {
  it("lista os Arquivos de todas as Pastas, mesmo aninhadas", () => {
    const tree = buildStoodTree(
      [
        { id: "aulas", name: "Aulas", parentId: null },
        { id: "semana-1", name: "Semana 1", parentId: "aulas" },
      ],
      [
        { id: "resumo", name: "Resumo", type: "note", folderId: null },
        { id: "aula-1", name: "Aula 1", type: "video", folderId: "semana-1" },
      ],
    );

    expect(buildTreeFiles(tree).map((file) => file.id)).toEqual(["aula-1", "resumo"]);
  });
});
