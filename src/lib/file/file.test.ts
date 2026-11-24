import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { fileBlobs, files, stoods } from "@/db/schema";
import { EMPTY_DRAWING_CONTENT, MAX_DRAWING_LENGTH, buildDrawingContent } from "@/lib/drawing/scene";
import {
  createDrawingFile,
  createImageFile,
  createNoteFile,
  createVideoFile,
  deleteFile,
  findImage,
  getStoodEditableContents,
  updateDrawingContent,
  updateFileName,
  updateNoteContent,
} from "@/lib/file/file";
import { MAX_IMAGE_BYTES } from "@/lib/file/image";
import { MAX_NOTE_LENGTH } from "@/lib/file/note";
import { createFile, createFolder, createStood, createUser } from "@/test/db";

const VIDEO_ID = "dQw4w9WgXcQ";
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_BYTES = Uint8Array.from([...PNG_HEADER, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const GIF_BYTES = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00]);

describe("createImageFile", () => {
  it("cria a Imagem na raiz do Stood e guarda os bytes com o formato", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const result = await createImageFile(ownerId, { stoodId: stood.id, name: "Gráfico", bytes: PNG_BYTES });

    const fileId = result.ok ? result.file.id : "";
    expect({ file: await getFileRow(fileId), image: await findImage(ownerId, fileId) }).toEqual({
      file: { ownerId, stoodId: stood.id, folderId: null, type: "image", name: "Gráfico", content: null },
      image: { mimeType: "image/png", data: Buffer.from(PNG_BYTES) },
    });
  });

  it("devolve o Arquivo no formato da árvore da barra lateral", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createImageFile(ownerId, { stoodId: stood.id, name: "Gráfico", bytes: PNG_BYTES })).resolves.toStrictEqual({
      ok: true,
      file: { kind: "file", id: expect.any(String), name: "Gráfico", type: "image" },
    });
  });

  it("aceita a Imagem no limite de tamanho", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const bytes = new Uint8Array(MAX_IMAGE_BYTES);
    bytes.set(PNG_HEADER);

    await expect(createImageFile(ownerId, { stoodId: stood.id, name: "Foto", bytes })).resolves.toMatchObject({ ok: true });
  });

  it.each([
    ["vazia", new Uint8Array(), "imagem-vazia"],
    ["acima de 5 MB", Uint8Array.from([...PNG_HEADER, ...new Uint8Array(MAX_IMAGE_BYTES)]), "imagem-grande"],
    ["em formato não aceito", GIF_BYTES, "formato-nao-suportado"],
  ])("recusa Imagem %s sem criar o Arquivo", async (_case, bytes, reason) => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const result = await createImageFile(ownerId, { stoodId: stood.id, name: "Gráfico", bytes });

    expect({ result, names: await getStoodFileNames(stood.id) }).toEqual({ result: { ok: false, reason }, names: [] });
  });

  it("recusa nome de outra Imagem do Stood sem guardar os bytes", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createImageFile(ownerId, { stoodId: stood.id, name: "Gráfico", bytes: PNG_BYTES });

    const result = await createImageFile(ownerId, { stoodId: stood.id, name: "gráfico", bytes: PNG_BYTES });

    expect({ result, blobs: await countOwnerBlobs(ownerId) }).toEqual({ result: { ok: false, reason: "nome-repetido" }, blobs: 1 });
  });

  it("recusa Stood de outro Usuário sem guardar os bytes", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    const result = await createImageFile(ownerId, { stoodId: otherStood.id, name: "Gráfico", bytes: PNG_BYTES });

    expect({ result, blobs: await countOwnerBlobs(ownerId) }).toEqual({
      result: { ok: false, reason: "stood-nao-encontrado" },
      blobs: 0,
    });
  });
});

describe("findImage", () => {
  it("não acha a Imagem de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const created = await createImageFile(otherId, { stoodId: otherStood.id, name: "Gráfico", bytes: PNG_BYTES });
    const ownerId = await createUser();

    await expect(findImage(ownerId, created.ok ? created.file.id : "")).resolves.toBeUndefined();
  });

  it("não acha um Arquivo que não é Imagem", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const note = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    await expect(findImage(ownerId, note.id)).resolves.toBeUndefined();
  });

  it("não acha id que não é uuid", async () => {
    const ownerId = await createUser();

    await expect(findImage(ownerId, "nao-e-uuid")).resolves.toBeUndefined();
  });
});

describe("createVideoFile", () => {
  it("cria o Vídeo na raiz do Stood com o id do YouTube", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const result = await createVideoFile(ownerId, { stoodId: stood.id, videoId: VIDEO_ID, name: "Limites" });

    expect(result.ok && (await getFileRow(result.file.id))).toEqual({
      ownerId,
      stoodId: stood.id,
      folderId: null,
      type: "video",
      name: "Limites",
      content: VIDEO_ID,
    });
  });

  it("devolve o Arquivo no formato da árvore da barra lateral", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createVideoFile(ownerId, { stoodId: stood.id, videoId: VIDEO_ID, name: "Limites" })).resolves.toEqual({
      ok: true,
      file: { kind: "file", id: expect.any(String), name: "Limites", type: "video", videoId: VIDEO_ID },
    });
  });

  it("aceita o nome de um Arquivo de outro tipo", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createFile(ownerId, stood.id, { type: "note", name: "Limites", content: "# Limites" });

    await expect(
      createVideoFile(ownerId, { stoodId: stood.id, videoId: VIDEO_ID, name: "Limites" }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("recusa nome de outro Vídeo do Stood sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createFile(ownerId, stood.id, { type: "video", name: "Limites", content: VIDEO_ID });

    await expect(createVideoFile(ownerId, { stoodId: stood.id, videoId: VIDEO_ID, name: "LIMITES" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });

  it.each([
    ["vazio", "", "nome-vazio"],
    ["com 51 caracteres", "a".repeat(51), "nome-longo"],
    ["com /", "Aula 1/2", "nome-com-separador"],
    ["com espaço no fim", "Limites ", "nome-com-espaco-nas-pontas"],
  ])("recusa nome %s", async (_case, name, reason) => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createVideoFile(ownerId, { stoodId: stood.id, videoId: VIDEO_ID, name })).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it("recusa id de vídeo fora do formato do YouTube", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createVideoFile(ownerId, { stoodId: stood.id, videoId: "abc", name: "Limites" })).resolves.toEqual({
      ok: false,
      reason: "video-invalido",
    });
  });

  it("recusa Stood de outro Usuário sem gravar nada nele", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    const result = await createVideoFile(ownerId, { stoodId: otherStood.id, videoId: VIDEO_ID, name: "Limites" });

    expect({ result, rows: await getStoodFileNames(otherStood.id) }).toEqual({
      result: { ok: false, reason: "stood-nao-encontrado" },
      rows: [],
    });
  });

  it("recusa id de Stood que não é uuid", async () => {
    const ownerId = await createUser();

    await expect(createVideoFile(ownerId, { stoodId: "nao-e-uuid", videoId: VIDEO_ID, name: "Limites" })).resolves.toEqual({
      ok: false,
      reason: "stood-nao-encontrado",
    });
  });
});

describe("createNoteFile", () => {
  it("cria a Nota vazia na raiz do Stood", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const result = await createNoteFile(ownerId, { stoodId: stood.id, name: "Resumo" });

    expect(result.ok && (await getFileRow(result.file.id))).toEqual({
      ownerId,
      stoodId: stood.id,
      folderId: null,
      type: "note",
      name: "Resumo",
      content: "",
    });
  });

  it("devolve o Arquivo no formato da árvore da barra lateral", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createNoteFile(ownerId, { stoodId: stood.id, name: "Resumo" })).resolves.toStrictEqual({
      ok: true,
      file: { kind: "file", id: expect.any(String), name: "Resumo", type: "note" },
    });
  });

  it("recusa nome de outra Nota do Stood sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    await expect(createNoteFile(ownerId, { stoodId: stood.id, name: "resumo" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });

  it("recusa nome inválido", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createNoteFile(ownerId, { stoodId: stood.id, name: "  " })).resolves.toEqual({
      ok: false,
      reason: "nome-vazio",
    });
  });

  it("recusa Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(createNoteFile(ownerId, { stoodId: otherStood.id, name: "Resumo" })).resolves.toEqual({
      ok: false,
      reason: "stood-nao-encontrado",
    });
  });
});

describe("createNoteFile: Pasta", () => {
  it("cria a Nota dentro da Pasta escolhida", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const folder = await createFolder(ownerId, stood.id, { name: "Aulas" });

    const result = await createNoteFile(ownerId, { stoodId: stood.id, folderId: folder.id, name: "Resumo" });

    expect(result.ok && (await getFileRow(result.file.id))?.folderId).toBe(folder.id);
  });

  it("aceita na Pasta o nome que já existe na raiz", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const folder = await createFolder(ownerId, stood.id, { name: "Aulas" });
    await createNoteFile(ownerId, { stoodId: stood.id, name: "Resumo" });

    const result = await createNoteFile(ownerId, { stoodId: stood.id, folderId: folder.id, name: "Resumo" });

    expect(result.ok).toBe(true);
  });

  it("recusa a Pasta de outro Stood como inexistente", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const other = await createStood(ownerId, "Física II");
    const folder = await createFolder(ownerId, other.id, { name: "Aulas" });

    await expect(createNoteFile(ownerId, { stoodId: stood.id, folderId: folder.id, name: "Resumo" })).resolves.toEqual({
      ok: false,
      reason: "pasta-nao-encontrada",
    });
  });
});

describe("updateFileName", () => {
  it("troca o nome do Arquivo", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const file = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    const result = await updateFileName(ownerId, { fileId: file.id, name: "Resumo da prova" });

    expect([result, (await getFileRow(file.id))?.name]).toEqual([{ ok: true, name: "Resumo da prova" }, "Resumo da prova"]);
  });

  it("recusa o nome de outro Arquivo do mesmo tipo na mesma Pasta, sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });
    const file = await createFile(ownerId, stood.id, { type: "note", name: "Rascunho", content: "" });

    await expect(updateFileName(ownerId, { fileId: file.id, name: "resumo" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });

  it("recusa o nome inválido sem gravar", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const file = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    await expect(updateFileName(ownerId, { fileId: file.id, name: "a/b" })).resolves.toEqual({
      ok: false,
      reason: "nome-com-separador",
    });
  });

  it("trata o Arquivo de outro Usuário como inexistente e não o altera", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const file = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    const result = await updateFileName(await createUser(), { fileId: file.id, name: "Outro" });

    expect([result, (await getFileRow(file.id))?.name]).toEqual([{ ok: false, reason: "arquivo-nao-encontrado" }, "Resumo"]);
  });
});

describe("deleteFile", () => {
  it("apaga a Imagem junto com os bytes", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const created = await createImageFile(ownerId, { stoodId: stood.id, name: "Gráfico", bytes: PNG_BYTES });
    const fileId = created.ok ? created.file.id : "";

    const result = await deleteFile(ownerId, fileId);

    expect([result, await getFileRow(fileId), await findImage(ownerId, fileId)]).toEqual([{ ok: true }, undefined, undefined]);
  });

  it("tira a Janela do Arquivo apagado do Quadro salvo e mantém as outras", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const kept = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });
    const deleted = await createFile(ownerId, stood.id, { type: "note", name: "Rascunho", content: "" });
    const rect = { x: 0, y: 0, width: 300, height: 200 };
    await db
      .update(stoods)
      .set({
        boardWindows: [
          { fileId: kept.id, rect, restoreRect: null, z: 1 },
          { fileId: deleted.id, rect, restoreRect: null, z: 2 },
        ],
      })
      .where(eq(stoods.id, stood.id));

    await deleteFile(ownerId, deleted.id);

    const [row] = await db.select({ boardWindows: stoods.boardWindows }).from(stoods).where(eq(stoods.id, stood.id));
    expect(row.boardWindows.map((window) => window.fileId)).toEqual([kept.id]);
  });

  it("não apaga o Arquivo de outro Usuário", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const file = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    const result = await deleteFile(await createUser(), file.id);

    expect([result, (await getFileRow(file.id))?.name]).toEqual([{ ok: false, reason: "arquivo-nao-encontrado" }, "Resumo"]);
  });
});

describe("updateNoteContent", () => {
  it("grava o texto da Nota", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const note = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    const result = await updateNoteContent(ownerId, { fileId: note.id, content: "# Limites\n\nlim x→0" });

    expect({ result, content: (await getFileRow(note.id)).content }).toEqual({
      result: { ok: true },
      content: "# Limites\n\nlim x→0",
    });
  });

  it("aceita apagar todo o texto", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const note = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "# Limites" });

    await updateNoteContent(ownerId, { fileId: note.id, content: "" });

    expect((await getFileRow(note.id)).content).toBe("");
  });

  it("aceita o texto no limite de tamanho", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const note = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "" });

    await expect(
      updateNoteContent(ownerId, { fileId: note.id, content: "a".repeat(MAX_NOTE_LENGTH) }),
    ).resolves.toEqual({ ok: true });
  });

  it("recusa texto acima do limite sem gravar", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const note = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "# Limites" });

    const result = await updateNoteContent(ownerId, { fileId: note.id, content: "a".repeat(MAX_NOTE_LENGTH + 1) });

    expect({ result, content: (await getFileRow(note.id)).content }).toEqual({
      result: { ok: false, reason: "nota-longa" },
      content: "# Limites",
    });
  });

  it("não grava na Nota de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const note = await createFile(otherId, otherStood.id, { type: "note", name: "Resumo", content: "# Limites" });
    const ownerId = await createUser();

    const result = await updateNoteContent(ownerId, { fileId: note.id, content: "invadido" });

    expect({ result, content: (await getFileRow(note.id)).content }).toEqual({
      result: { ok: false, reason: "nota-nao-encontrada" },
      content: "# Limites",
    });
  });

  // Sem o filtro de tipo, o texto trocaria o id de um Vídeo ou a cena de um Desenho
  it.each([
    ["Vídeo", "video", VIDEO_ID],
    ["Desenho", "drawing", "{}"],
  ] as const)("não grava num Arquivo de %s", async (_case, type, content) => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const file = await createFile(ownerId, stood.id, { type, name: "Aula 1", content });

    const result = await updateNoteContent(ownerId, { fileId: file.id, content: "texto" });

    expect({ result, content: (await getFileRow(file.id)).content }).toEqual({
      result: { ok: false, reason: "nota-nao-encontrada" },
      content,
    });
  });

  it("recusa id que não é uuid", async () => {
    const ownerId = await createUser();

    await expect(updateNoteContent(ownerId, { fileId: "nao-e-uuid", content: "texto" })).resolves.toEqual({
      ok: false,
      reason: "nota-nao-encontrada",
    });
  });
});

describe("getStoodEditableContents", () => {
  it("devolve o conteúdo de cada Nota e Desenho do Stood, pelo id", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const folder = await createFolder(ownerId, stood.id);
    const root = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "# Limites" });
    const nested = await createFile(ownerId, stood.id, { type: "note", name: "Aula", content: "", folderId: folder.id });
    const drawing = await createFile(ownerId, stood.id, { type: "drawing", name: "Gráfico", content: EMPTY_DRAWING_CONTENT });

    await expect(getStoodEditableContents(ownerId, stood.id)).resolves.toEqual({
      [root.id]: "# Limites",
      [nested.id]: "",
      [drawing.id]: EMPTY_DRAWING_CONTENT,
    });
  });

  it("deixa de fora os outros tipos e os outros Stoods", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const otherStood = await createStood(ownerId, "Física I");
    await createFile(ownerId, stood.id, { type: "video", name: "Aula 1", content: VIDEO_ID });
    await createFile(ownerId, otherStood.id, { type: "note", name: "Resumo", content: "# Vetores" });

    await expect(getStoodEditableContents(ownerId, stood.id)).resolves.toEqual({});
  });

  it("não devolve o conteúdo do Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    await createFile(otherId, otherStood.id, { type: "note", name: "Resumo", content: "# Limites" });
    const ownerId = await createUser();

    await expect(getStoodEditableContents(ownerId, otherStood.id)).resolves.toEqual({});
  });

  it("devolve vazio para id que não é uuid", async () => {
    const ownerId = await createUser();

    await expect(getStoodEditableContents(ownerId, "nao-e-uuid")).resolves.toEqual({});
  });
});

describe("createDrawingFile", () => {
  it("cria o Desenho vazio na raiz do Stood", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const result = await createDrawingFile(ownerId, { stoodId: stood.id, name: "Gráfico" });

    expect(result.ok && (await getFileRow(result.file.id))).toEqual({
      ownerId,
      stoodId: stood.id,
      folderId: null,
      type: "drawing",
      name: "Gráfico",
      content: EMPTY_DRAWING_CONTENT,
    });
  });

  it("devolve o Arquivo no formato da árvore da barra lateral", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createDrawingFile(ownerId, { stoodId: stood.id, name: "Gráfico" })).resolves.toStrictEqual({
      ok: true,
      file: { kind: "file", id: expect.any(String), name: "Gráfico", type: "drawing" },
    });
  });

  it("recusa nome de outro Desenho do Stood", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createDrawingFile(ownerId, { stoodId: stood.id, name: "Gráfico" });

    await expect(createDrawingFile(ownerId, { stoodId: stood.id, name: "GRÁFICO" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });
});

describe("updateDrawingContent", () => {
  const SCENE_CONTENT = buildDrawingContent({
    version: 1,
    elements: [{ kind: "line", id: "a", start: { x: 0, y: 0 }, end: { x: 10, y: 10 }, color: "ink", strokeWidth: 2 }],
  });

  it("grava a cena do Desenho", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const drawing = await createFile(ownerId, stood.id, { type: "drawing", name: "Gráfico", content: EMPTY_DRAWING_CONTENT });

    const result = await updateDrawingContent(ownerId, { fileId: drawing.id, content: SCENE_CONTENT });

    expect({ result, content: (await getFileRow(drawing.id)).content }).toEqual({ result: { ok: true }, content: SCENE_CONTENT });
  });

  it.each([
    ["fora do formato", JSON.stringify({ version: 1, elements: [{ kind: "star" }] })],
    ["acima do limite de tamanho", `${" ".repeat(MAX_DRAWING_LENGTH)}${EMPTY_DRAWING_CONTENT}`],
  ])("recusa cena %s sem gravar", async (_case, content) => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const drawing = await createFile(ownerId, stood.id, { type: "drawing", name: "Gráfico", content: EMPTY_DRAWING_CONTENT });

    const result = await updateDrawingContent(ownerId, { fileId: drawing.id, content });

    expect({ result, content: (await getFileRow(drawing.id)).content }).toEqual({
      result: { ok: false, reason: "desenho-invalido" },
      content: EMPTY_DRAWING_CONTENT,
    });
  });

  it("não grava no Desenho de outro Usuário", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const drawing = await createFile(otherId, otherStood.id, { type: "drawing", name: "Gráfico", content: EMPTY_DRAWING_CONTENT });
    const ownerId = await createUser();

    const result = await updateDrawingContent(ownerId, { fileId: drawing.id, content: SCENE_CONTENT });

    expect({ result, content: (await getFileRow(drawing.id)).content }).toEqual({
      result: { ok: false, reason: "desenho-nao-encontrado" },
      content: EMPTY_DRAWING_CONTENT,
    });
  });

  it("não grava a cena numa Nota", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const note = await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "# Limites" });

    await expect(updateDrawingContent(ownerId, { fileId: note.id, content: SCENE_CONTENT })).resolves.toEqual({
      ok: false,
      reason: "desenho-nao-encontrado",
    });
  });
});

async function getFileRow(id: string) {
  const [row] = await db
    .select({
      ownerId: files.ownerId,
      stoodId: files.stoodId,
      folderId: files.folderId,
      type: files.type,
      name: files.name,
      content: files.content,
    })
    .from(files)
    .where(eq(files.id, id))
    .limit(1);
  return row;
}

async function getStoodFileNames(stoodId: string) {
  const rows = await db.select({ name: files.name }).from(files).where(eq(files.stoodId, stoodId));
  return rows.map((row) => row.name);
}

async function countOwnerBlobs(ownerId: string) {
  const rows = await db.select({ fileId: fileBlobs.fileId }).from(fileBlobs).where(eq(fileBlobs.ownerId, ownerId));
  return rows.length;
}
