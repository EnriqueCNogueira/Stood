import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { files, folders, stoodTags, stoods, tags } from "@/db/schema";
import {
  createStood,
  deleteStood,
  findBoardStood,
  getLibraryStoods,
  getRecentStoods,
  updateStood,
  updateStoodLastOpenedAt,
} from "@/lib/stood/stood";
import { buildStoodTree } from "@/lib/stood/tree";
import { createFile, createFolder, createStood as createStoodRow, createTag, createUser } from "@/test/db";

const MS_PER_DAY = 86_400_000;
const VALID_VIDEO_ID = "dQw4w9WgXcQ";

describe("createStood", () => {
  it("cria o Stood com nome e descrição", async () => {
    const ownerId = await createUser();

    const result = await createStood(ownerId, { name: "Cálculo I", description: "Limites e derivadas" });

    expect(result.ok && (await getStoodRow(result.id))).toMatchObject({
      ownerId,
      name: "Cálculo I",
      description: "Limites e derivadas",
    });
  });

  it("apara a descrição e grava nulo quando ela fica vazia", async () => {
    const ownerId = await createUser();

    const result = await createStood(ownerId, { name: "Cálculo I", description: "   " });

    expect(result.ok && (await getStoodRow(result.id))).toMatchObject({ description: null });
  });

  it("aceita o nome de outro Usuário", async () => {
    const otherId = await createUser();
    await createStood(otherId, { name: "Cálculo I", description: "" });
    const ownerId = await createUser();

    await expect(createStood(ownerId, { name: "Cálculo I", description: "" })).resolves.toMatchObject({ ok: true });
  });

  it("recusa nome repetido sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    await createStood(ownerId, { name: "Cálculo I", description: "" });

    await expect(createStood(ownerId, { name: "CÁLCULO i", description: "" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });

  it.each([
    ["vazio", "", "nome-vazio"],
    ["só com espaços", "   ", "nome-vazio"],
    ["com 51 caracteres", "a".repeat(51), "nome-longo"],
    ["com /", "Aulas/Limites", "nome-com-separador"],
    ["com \\", "Aulas\\Limites", "nome-com-separador"],
    ["com espaço no início", " Limites", "nome-com-espaco-nas-pontas"],
    ["com espaço no fim", "Limites ", "nome-com-espaco-nas-pontas"],
  ])("recusa nome %s", async (_case, name, reason) => {
    const ownerId = await createUser();

    await expect(createStood(ownerId, { name, description: "" })).resolves.toEqual({ ok: false, reason });
  });

  it("recusa descrição com mais de 200 caracteres depois de aparar", async () => {
    const ownerId = await createUser();

    await expect(createStood(ownerId, { name: "Cálculo I", description: "a".repeat(201) })).resolves.toEqual({
      ok: false,
      reason: "descricao-longa",
    });
  });
});

describe("updateStood", () => {
  it("troca o nome e a descrição", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;

    await updateStood(ownerId, stoodId, { name: "Cálculo II", description: "Integrais" });

    expect(await getStoodRow(stoodId)).toMatchObject({ name: "Cálculo II", description: "Integrais" });
  });

  it("não muda a hora em que o Stood foi aberto", async () => {
    const ownerId = await createUser();
    const openedAt = new Date(Date.now() - 3 * MS_PER_DAY);
    const stoodId = (await createStoodRow(ownerId, "Cálculo I", { lastOpenedAt: openedAt })).id;

    await updateStood(ownerId, stoodId, { name: "Cálculo II", description: "" });

    expect((await getStoodRow(stoodId)).lastOpenedAt).toEqual(openedAt);
  });

  it("aceita manter o próprio nome mudando só as maiúsculas", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;

    await expect(updateStood(ownerId, stoodId, { name: "CÁLCULO I", description: "" })).resolves.toEqual({ ok: true });
  });

  it("recusa o nome de outro Stood do mesmo dono", async () => {
    const ownerId = await createUser();
    await createStoodRow(ownerId, "Física");
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;

    await expect(updateStood(ownerId, stoodId, { name: "física", description: "" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });

  it("trata o Stood de outro Usuário como inexistente e não o altera", async () => {
    const otherId = await createUser();
    const stoodId = (await createStoodRow(otherId, "Cálculo I")).id;
    const ownerId = await createUser();

    const result = await updateStood(ownerId, stoodId, { name: "Invadido", description: "" });

    expect({ result, name: (await getStoodRow(stoodId)).name }).toEqual({
      result: { ok: false, reason: "stood-nao-encontrado" },
      name: "Cálculo I",
    });
  });

  it("recusa id que não é uuid como Stood inexistente", async () => {
    const ownerId = await createUser();

    await expect(updateStood(ownerId, "nao-e-uuid", { name: "Cálculo", description: "" })).resolves.toEqual({
      ok: false,
      reason: "stood-nao-encontrado",
    });
  });

  it("recusa descrição longa com as mesmas regras da criação", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;

    await expect(updateStood(ownerId, stoodId, { name: "Cálculo I", description: "a".repeat(201) })).resolves.toEqual({
      ok: false,
      reason: "descricao-longa",
    });
  });
});

describe("getLibraryStoods", () => {
  it("devolve os Stoods do dono em ordem alfabética, sem diferenciar acento nem maiúsculas", async () => {
    const ownerId = await createUser();
    await createStoodRow(ownerId, "física");
    await createStoodRow(ownerId, "Química");
    await createStoodRow(ownerId, "Álgebra");

    const library = await getLibraryStoods(ownerId);

    expect(library.map((stood) => stood.name)).toEqual(["Álgebra", "física", "Química"]);
  });

  it("monta a árvore de cada Stood com Pastas e Arquivos", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I", { description: "Limites" })).id;
    const folderId = (await createFolder(ownerId, stoodId, { name: "Aulas" })).id;
    await createFile(ownerId, stoodId, { name: "Aula 1", type: "video", content: VALID_VIDEO_ID, folderId });
    await createFile(ownerId, stoodId, { name: "Resumo", type: "note", content: "# Limites" });

    const [stood] = await getLibraryStoods(ownerId);

    expect(stood).toMatchObject({
      name: "Cálculo I",
      description: "Limites",
      tree: [
        { kind: "folder", name: "Aulas", children: [{ kind: "file", name: "Aula 1", type: "video" }] },
        { kind: "file", name: "Resumo", type: "note" },
      ],
    });
  });

  it("devolve Stood sem Pastas nem Arquivos com a árvore vazia", async () => {
    const ownerId = await createUser();
    await createStoodRow(ownerId, "Cálculo I");

    await expect(getLibraryStoods(ownerId)).resolves.toMatchObject([{ name: "Cálculo I", tree: [] }]);
  });

  it("não devolve Stoods, Pastas nem Arquivos de outro Usuário", async () => {
    const otherId = await createUser();
    await createStoodRow(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(getLibraryStoods(ownerId)).resolves.toEqual([]);
  });
});

describe("getRecentStoods", () => {
  it("devolve os 3 Stoods abertos mais recentemente, do mais novo ao mais antigo", async () => {
    const ownerId = await createUser();
    await createStoodRow(ownerId, "Há 4 dias", { lastOpenedAt: buildDaysAgo(4) });
    await createStoodRow(ownerId, "Há 1 dia", { lastOpenedAt: buildDaysAgo(1) });
    await createStoodRow(ownerId, "Há 3 dias", { lastOpenedAt: buildDaysAgo(3) });
    await createStoodRow(ownerId, "Há 2 dias", { lastOpenedAt: buildDaysAgo(2) });

    const recent = await getRecentStoods(ownerId);

    expect(recent.map((stood) => stood.name)).toEqual(["Há 1 dia", "Há 2 dias", "Há 3 dias"]);
  });

  it("conta os Arquivos de cada tipo, inclusive os de dentro das Pastas", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I", { description: "Limites" })).id;
    const folderId = (await createFolder(ownerId, stoodId, { name: "Aulas" })).id;
    await createFile(ownerId, stoodId, { name: "Resumo", type: "note", content: "# Limites" });
    await createFile(ownerId, stoodId, { name: "Exercícios", type: "note", content: "# Lista", folderId });
    await createFile(ownerId, stoodId, { name: "Lousa", type: "image", folderId });

    const [stood] = await getRecentStoods(ownerId);

    expect(stood).toMatchObject({
      name: "Cálculo I",
      description: "Limites",
      fileCounts: { note: 2, drawing: 0, image: 1, video: 0 },
    });
  });

  it("não devolve Stoods de outro Usuário", async () => {
    const otherId = await createUser();
    await createStoodRow(otherId, "Cálculo I");
    const ownerId = await createUser();

    await expect(getRecentStoods(ownerId)).resolves.toEqual([]);
  });
});

describe("findBoardStood", () => {
  it("devolve nome, descrição e a árvore do Stood", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I", { description: "Limites" })).id;
    await createFile(ownerId, stoodId, { name: "Lousa", type: "image" });

    await expect(findBoardStood(ownerId, stoodId)).resolves.toMatchObject({
      id: stoodId,
      name: "Cálculo I",
      description: "Limites",
      tree: [{ kind: "file", name: "Lousa", type: "image" }],
    });
  });

  // O player da Janela precisa do id; o texto da Nota não vai para a árvore, que chega inteira ao navegador
  it("leva o id do YouTube só nos Vídeos", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;
    await createFile(ownerId, stoodId, { name: "Aula 1", type: "video", content: VALID_VIDEO_ID });
    await createFile(ownerId, stoodId, { name: "Resumo", type: "note", content: "# Limites" });

    const stood = await findBoardStood(ownerId, stoodId);

    expect(stood?.tree).toStrictEqual([
      { kind: "file", id: expect.any(String), name: "Aula 1", type: "video", videoId: VALID_VIDEO_ID },
      { kind: "file", id: expect.any(String), name: "Resumo", type: "note" },
    ]);
  });

  it("devolve as Janelas salvas do Quadro", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;
    const note = await createFile(ownerId, stoodId, { name: "Resumo", type: "note", content: "" });
    const windows = [{ fileId: note.id, rect: { x: 24, y: 24, width: 380, height: 380 }, restoreRect: null, z: 1 }];
    await db.update(stoods).set({ boardWindows: windows }).where(eq(stoods.id, stoodId));

    await expect(findBoardStood(ownerId, stoodId)).resolves.toMatchObject({ boardWindows: windows });
  });

  it("abre o Quadro vazio quando as Janelas salvas estão fora do formato", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;
    await db.update(stoods).set({ boardWindows: [{ fileId: "a" }] as never }).where(eq(stoods.id, stoodId));

    await expect(findBoardStood(ownerId, stoodId)).resolves.toMatchObject({ boardWindows: [] });
  });

  it("não devolve o Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const stoodId = (await createStoodRow(otherId, "Cálculo I")).id;
    const ownerId = await createUser();

    await expect(findBoardStood(ownerId, stoodId)).resolves.toBeUndefined();
  });

  it("não acha id que não é uuid", async () => {
    const ownerId = await createUser();

    await expect(findBoardStood(ownerId, "nao-e-uuid")).resolves.toBeUndefined();
  });
});

describe("createStood: Tags", () => {
  it("grava nome, descrição e Tags juntos, criando a Tag nova só ao salvar", async () => {
    const ownerId = await createUser();
    const exams = await createTag(ownerId, "Prova");

    const result = await createStood(ownerId, {
      name: "Cálculo I",
      description: "",
      tags: { tagIds: [exams.id], newTagNames: ["Exatas"] },
    });

    const stoodId = result.ok ? result.id : "";
    expect(await getStoodTagNames(stoodId)).toEqual(["Exatas", "Prova"]);
  });

  it("não grava o Stood quando as Tags são recusadas", async () => {
    const ownerId = await createUser();
    const ownedTags = await db
      .insert(tags)
      .values(Array.from({ length: 11 }, (_, index) => ({ ownerId, name: `Tag ${index + 1}` })))
      .returning({ id: tags.id });

    const result = await createStood(ownerId, {
      name: "Cálculo I",
      description: "",
      tags: { tagIds: ownedTags.map((tag) => tag.id), newTagNames: [] },
    });

    expect(result).toEqual({ ok: false, reason: "limite-de-tags-do-stood" });
    expect(await db.select().from(stoods).where(eq(stoods.ownerId, ownerId))).toEqual([]);
  });
});

describe("updateStood: Tags", () => {
  it("troca as Tags junto com nome e descrição e devolve as Tags salvas", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo")).id;
    await createTag(ownerId, "Prova", [stoodId]);
    const sciences = await createTag(ownerId, "Exatas");

    const result = await updateStood(ownerId, stoodId, {
      name: "Cálculo I",
      description: "",
      tags: { tagIds: [sciences.id], newTagNames: [] },
    });

    expect(result).toEqual({ ok: true, tags: [{ id: sciences.id, name: "Exatas" }] });
    expect([(await getStoodRow(stoodId)).name, await getStoodTagNames(stoodId)]).toEqual(["Cálculo I", ["Exatas"]]);
  });

  it("não troca nome nem descrição quando as Tags são recusadas", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo")).id;

    const result = await updateStood(ownerId, stoodId, {
      name: "Cálculo I",
      description: "",
      tags: { tagIds: [], newTagNames: ["a".repeat(31)] },
    });

    expect(result).toEqual({ ok: false, reason: "nome-da-tag-longo" });
    expect((await getStoodRow(stoodId)).name).toBe("Cálculo");
  });

  it("não marca Tags no Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const stoodId = (await createStoodRow(otherId, "Cálculo I")).id;
    const ownerId = await createUser();

    const result = await updateStood(ownerId, stoodId, {
      name: "Cálculo I",
      description: "",
      tags: { tagIds: [], newTagNames: ["Prova"] },
    });

    expect(result).toEqual({ ok: false, reason: "stood-nao-encontrado" });
    expect(await getStoodTagNames(stoodId)).toEqual([]);
  });
});

describe("listas de Stoods: Tags", () => {
  it("devolvem as Tags de cada Stood em ordem alfabética", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;
    await createTag(ownerId, "Prova", [stoodId]);
    await createTag(ownerId, "Exatas", [stoodId]);
    const expectedTags = [{ name: "Exatas" }, { name: "Prova" }];

    const [library, recent, board] = await Promise.all([
      getLibraryStoods(ownerId),
      getRecentStoods(ownerId),
      findBoardStood(ownerId, stoodId),
    ]);

    expect([library[0].tags, recent[0].tags, board?.tags]).toMatchObject([expectedTags, expectedTags, expectedTags]);
  });

  it("devolvem lista vazia para o Stood sem Tags", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I")).id;

    await expect(findBoardStood(ownerId, stoodId)).resolves.toMatchObject({ tags: [] });
  });
});

describe("deleteStood", () => {
  it("apaga o Stood com as Pastas e os Arquivos dele", async () => {
    const ownerId = await createUser();
    const stood = await createStoodRow(ownerId, "Cálculo I");
    const folder = await createFolder(ownerId, stood.id, { name: "Aulas" });
    await createFile(ownerId, stood.id, { type: "note", name: "Resumo", content: "", folderId: folder.id });

    const result = await deleteStood(ownerId, stood.id);

    const [remainingFolders, remainingFiles] = await Promise.all([
      db.select({ id: folders.id }).from(folders).where(eq(folders.stoodId, stood.id)),
      db.select({ id: files.id }).from(files).where(eq(files.stoodId, stood.id)),
    ]);
    expect([result, remainingFolders, remainingFiles]).toEqual([{ ok: true }, [], []]);
  });

  it("não apaga o Stood de outro Usuário", async () => {
    const ownerId = await createUser();
    const stood = await createStoodRow(ownerId, "Cálculo I");

    const result = await deleteStood(await createUser(), stood.id);

    const [row] = await db.select({ id: stoods.id }).from(stoods).where(eq(stoods.id, stood.id));
    expect([result, row]).toEqual([{ ok: false, reason: "stood-nao-encontrado" }, { id: stood.id }]);
  });

  it("trata id fora do formato como inexistente", async () => {
    await expect(deleteStood(await createUser(), "nao-e-uuid")).resolves.toEqual({ ok: false, reason: "stood-nao-encontrado" });
  });
});

describe("updateStoodLastOpenedAt", () => {
  it("grava a hora de abertura", async () => {
    const ownerId = await createUser();
    const stoodId = (await createStoodRow(ownerId, "Cálculo I", { lastOpenedAt: buildDaysAgo(3) })).id;

    await updateStoodLastOpenedAt(ownerId, stoodId);

    expect((await getStoodRow(stoodId)).lastOpenedAt.getTime()).toBeGreaterThan(buildDaysAgo(1).getTime());
  });

  it("não grava no Stood de outro Usuário", async () => {
    const otherId = await createUser();
    const openedAt = buildDaysAgo(3);
    const stoodId = (await createStoodRow(otherId, "Cálculo I", { lastOpenedAt: openedAt })).id;
    const ownerId = await createUser();

    await updateStoodLastOpenedAt(ownerId, stoodId);

    expect((await getStoodRow(stoodId)).lastOpenedAt).toEqual(openedAt);
  });
});

describe("buildStoodTree", () => {
  it("aninha Pastas em vários níveis com Arquivos na raiz e dentro delas", () => {
    const tree = buildStoodTree(
      [
        { id: "derivadas", name: "Derivadas", parentId: "limites" },
        { id: "aulas", name: "Aulas", parentId: null },
        { id: "limites", name: "Limites", parentId: "aulas" },
      ],
      [
        { id: "grafico", name: "Gráfico", type: "drawing", folderId: "derivadas" },
        { id: "resumo", name: "Resumo", type: "note", folderId: null },
        { id: "aula-1", name: "Aula 1", type: "video", folderId: "aulas" },
      ],
    );

    expect(tree).toEqual([
      {
        kind: "folder",
        id: "aulas",
        name: "Aulas",
        children: [
          {
            kind: "folder",
            id: "limites",
            name: "Limites",
            children: [
              {
                kind: "folder",
                id: "derivadas",
                name: "Derivadas",
                children: [{ kind: "file", id: "grafico", name: "Gráfico", type: "drawing" }],
              },
            ],
          },
          { kind: "file", id: "aula-1", name: "Aula 1", type: "video" },
        ],
      },
      { kind: "file", id: "resumo", name: "Resumo", type: "note" },
    ]);
  });

  it("põe as Pastas antes dos Arquivos, cada grupo em ordem alfabética", () => {
    const tree = buildStoodTree(
      [
        { id: "provas", name: "Provas", parentId: null },
        { id: "aulas", name: "aulas", parentId: null },
      ],
      [
        { id: "b", name: "Exercícios", type: "drawing", folderId: null },
        { id: "a", name: "Álgebra", type: "note", folderId: null },
      ],
    );

    expect(tree.map((node) => node.name)).toEqual(["aulas", "Provas", "Álgebra", "Exercícios"]);
  });

  it("devolve a árvore vazia sem Pastas nem Arquivos", () => {
    expect(buildStoodTree([], [])).toEqual([]);
  });
});

async function getStoodTagNames(stoodId: string) {
  const rows = await db
    .select({ name: tags.name })
    .from(stoodTags)
    .innerJoin(tags, eq(tags.id, stoodTags.tagId))
    .where(eq(stoodTags.stoodId, stoodId));
  return rows.map((row) => row.name).sort();
}

async function getStoodRow(stoodId: string) {
  const [stood] = await db.select().from(stoods).where(eq(stoods.id, stoodId)).limit(1);
  return stood;
}

function buildDaysAgo(days: number) {
  return new Date(Date.now() - days * MS_PER_DAY);
}
