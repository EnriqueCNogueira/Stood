import { describe, expect, it } from "vitest";
import { buildExportEntries, buildExportTypeCounts, buildExportZipName } from "@/lib/export/export";
import { buildStoodTree } from "@/lib/stood/tree";

describe("buildExportTypeCounts", () => {
  it("conta Notas, Desenhos e Imagens de todas as Pastas", () => {
    const tree = buildStoodTree(
      [{ id: "aulas", name: "Aulas", parentId: null }],
      [
        { id: "resumo", name: "Resumo", type: "note", folderId: null },
        { id: "mapa", name: "Mapa", type: "drawing", folderId: "aulas" },
        { id: "lousa", name: "Lousa", type: "image", folderId: "aulas" },
        { id: "quadro", name: "Quadro", type: "image", folderId: null },
      ],
    );

    expect(buildExportTypeCounts(tree)).toEqual([
      { type: "note", count: 1 },
      { type: "drawing", count: 1 },
      { type: "image", count: 2 },
    ]);
  });

  it("deixa de fora o tipo que o Stood não tem", () => {
    const tree = buildStoodTree([], [{ id: "mapa", name: "Mapa", type: "drawing", folderId: null }]);

    expect(buildExportTypeCounts(tree)).toEqual([{ type: "drawing", count: 1 }]);
  });

  it("não conta Vídeo, que não é exportado", () => {
    const tree = buildStoodTree([], [{ id: "aula", name: "Aula", type: "video", folderId: null, videoId: "dQw4w9WgXcQ" }]);

    expect(buildExportTypeCounts(tree)).toEqual([]);
  });
});

describe("buildExportEntries", () => {
  it("monta o caminho de cada Arquivo com as Pastas e a extensão do tipo", () => {
    const tree = buildStoodTree(
      [
        { id: "aulas", name: "Aulas", parentId: null },
        { id: "semana-1", name: "Semana 1", parentId: "aulas" },
      ],
      [
        { id: "resumo", name: "Resumo", type: "note", folderId: null },
        { id: "mapa", name: "Mapa", type: "drawing", folderId: "aulas" },
        { id: "lousa", name: "Lousa", type: "image", folderId: "semana-1" },
      ],
    );

    expect(buildExportEntries(tree, ["note", "drawing", "image"])).toEqual([
      { fileId: "lousa", type: "image", path: "Aulas/Semana 1/Lousa.jpg" },
      { fileId: "mapa", type: "drawing", path: "Aulas/Mapa.pdf" },
      { fileId: "resumo", type: "note", path: "Resumo.txt" },
    ]);
  });

  it("só inclui os tipos marcados", () => {
    const tree = buildStoodTree(
      [],
      [
        { id: "resumo", name: "Resumo", type: "note", folderId: null },
        { id: "mapa", name: "Mapa", type: "drawing", folderId: null },
      ],
    );

    expect(buildExportEntries(tree, ["drawing"]).map((entry) => entry.fileId)).toEqual(["mapa"]);
  });

  it("mantém a Nota e o Desenho de mesmo nome, que saem com extensões diferentes", () => {
    const tree = buildStoodTree(
      [],
      [
        { id: "nota", name: "Aula 1", type: "note", folderId: null },
        { id: "desenho", name: "Aula 1", type: "drawing", folderId: null },
      ],
    );

    expect(buildExportEntries(tree, ["note", "drawing"]).map((entry) => entry.path).sort()).toEqual([
      "Aula 1.pdf",
      "Aula 1.txt",
    ]);
  });

  it("troca os caracteres que o Windows não aceita em nome de arquivo", () => {
    const tree = buildStoodTree(
      [{ id: "pasta", name: "Prova: P1?", parentId: null }],
      [{ id: "resumo", name: 'Limites <"x→0">*|', type: "note", folderId: "pasta" }],
    );

    expect(buildExportEntries(tree, ["note"])[0].path).toBe("Prova- P1-/Limites --x→0----.txt");
  });

  it("tira ponto e espaço do fim do nome, que o Windows descarta", () => {
    const tree = buildStoodTree([], [{ id: "resumo", name: "Resumo...", type: "note", folderId: null }]);

    expect(buildExportEntries(tree, ["note"])[0].path).toBe("Resumo.txt");
  });

  it("numera o caminho repetido depois da troca de caracteres, sem diferenciar maiúscula", () => {
    const tree = buildStoodTree(
      [],
      [
        { id: "a", name: "Prova: 1", type: "note", folderId: null },
        { id: "b", name: "prova? 1", type: "note", folderId: null },
      ],
    );
    const paths = buildExportEntries(tree, ["note"]).map((entry) => entry.path.toLowerCase());

    expect(paths.sort()).toEqual(["prova- 1 (2).txt", "prova- 1.txt"]);
  });

  it("dá nome ao Arquivo que só tem caracteres trocados por nada", () => {
    const tree = buildStoodTree([], [{ id: "resumo", name: "...", type: "note", folderId: null }]);

    expect(buildExportEntries(tree, ["note"])[0].path).toBe("Arquivo.txt");
  });
});

describe("buildExportZipName", () => {
  it("usa o nome do Stood com a extensão .zip", () => {
    expect(buildExportZipName("Cálculo 1")).toBe("Cálculo 1.zip");
  });

  it("troca os caracteres que o Windows não aceita", () => {
    expect(buildExportZipName("P1: Limites?")).toBe("P1- Limites-.zip");
  });
});
