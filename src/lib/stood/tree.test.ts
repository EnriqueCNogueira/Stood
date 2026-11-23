import { describe, expect, it } from "vitest";
import { type StoodTreeFile, buildStoodTree, buildTreeFiles, buildTreeWithFile } from "@/lib/stood/tree";

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
