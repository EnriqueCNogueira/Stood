import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { stoodTags, stoods, tags, users } from "@/db/schema";
import { MAX_TAGS_PER_STOOD, MAX_TAGS_PER_USER } from "@/lib/tag/rules";
import { createTag, deleteTag, getTags, updateStoodTags, updateTagName, updateTagStoods } from "@/lib/tag/tag";
import { createStood, createTag as createTagRow, createUser, trackWriteOrder } from "@/test/db";

async function getTagNames(ownerId: string) {
  const rows = await db.select({ name: tags.name }).from(tags).where(eq(tags.ownerId, ownerId));
  return rows.map((row) => row.name).sort();
}

async function getStoodTagIds(stoodId: string) {
  const rows = await db.select({ tagId: stoodTags.tagId }).from(stoodTags).where(eq(stoodTags.stoodId, stoodId));
  return rows.map((row) => row.tagId).sort();
}

// Cria as Tags direto no banco, para chegar perto do limite sem uma chamada por Tag
async function createManyTags(ownerId: string, total: number) {
  const rows = Array.from({ length: total }, (_, index) => ({ ownerId, name: `Tag ${index + 1}` }));
  return db.insert(tags).values(rows).returning({ id: tags.id, name: tags.name });
}

function updateStoodTagsInTransaction(ownerId: string, stoodId: string, input: { tagIds: string[]; newTagNames: string[] }) {
  return db.transaction((tx) => updateStoodTags(tx, ownerId, stoodId, input));
}

describe("createTag", () => {
  it("cria a Tag com o nome aparado", async () => {
    const ownerId = await createUser();

    const result = await createTag(ownerId, "  Prova  ");

    expect(result).toMatchObject({ ok: true, tag: { name: "Prova" } });
    expect(await getTagNames(ownerId)).toEqual(["Prova"]);
  });

  it("aceita o nome de uma Tag de outro Usuário", async () => {
    const otherId = await createUser();
    await createTagRow(otherId, "Prova");
    const ownerId = await createUser();

    await expect(createTag(ownerId, "Prova")).resolves.toMatchObject({ ok: true });
  });

  it("aceita a 100ª Tag do Usuário", async () => {
    const ownerId = await createUser();
    await createManyTags(ownerId, MAX_TAGS_PER_USER - 1);

    await expect(createTag(ownerId, "Prova")).resolves.toMatchObject({ ok: true });
  });

  it("cria só uma Tag quando duas abas passam do limite juntas", async () => {
    const ownerId = await createUser();
    await createManyTags(ownerId, MAX_TAGS_PER_USER - 1);

    const results = await Promise.all([createTag(ownerId, "Prova"), createTag(ownerId, "Exatas")]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("recusa nome repetido sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    await createTagRow(ownerId, "Prova");

    await expect(createTag(ownerId, "PROVA")).resolves.toEqual({ ok: false, reason: "nome-da-tag-repetido" });
  });

  it.each([
    ["vazio", "   ", "nome-da-tag-vazio"],
    ["acima de 30 caracteres", "a".repeat(31), "nome-da-tag-longo"],
  ])("recusa nome %s", async (_case, name, reason) => {
    const ownerId = await createUser();

    await expect(createTag(ownerId, name)).resolves.toEqual({ ok: false, reason });
  });

  it("recusa a 101ª Tag do Usuário", async () => {
    const ownerId = await createUser();
    await createManyTags(ownerId, MAX_TAGS_PER_USER);

    await expect(createTag(ownerId, "Prova")).resolves.toEqual({ ok: false, reason: "limite-de-tags" });
  });
});

describe("updateTagName", () => {
  it("troca o nome da Tag, que continua marcando os mesmos Stoods", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const tag = await createTagRow(ownerId, "Prova", [stood.id]);

    const result = await updateTagName(ownerId, tag.id, " Prova final ");

    expect(result).toEqual({ ok: true });
    expect([await getTagNames(ownerId), await getStoodTagIds(stood.id)]).toEqual([["Prova final"], [tag.id]]);
  });

  it("aceita trocar só as maiúsculas do próprio nome", async () => {
    const ownerId = await createUser();
    const tag = await createTagRow(ownerId, "prova");

    await expect(updateTagName(ownerId, tag.id, "Prova")).resolves.toEqual({ ok: true });
  });

  it("recusa o nome de outra Tag do dono", async () => {
    const ownerId = await createUser();
    await createTagRow(ownerId, "Prova");
    const tag = await createTagRow(ownerId, "prova final");

    await expect(updateTagName(ownerId, tag.id, "prova")).resolves.toEqual({ ok: false, reason: "nome-da-tag-repetido" });
  });

  it("trata a Tag de outro Usuário como inexistente e não a altera", async () => {
    const otherId = await createUser();
    const tag = await createTagRow(otherId, "Prova");
    const ownerId = await createUser();

    const result = await updateTagName(ownerId, tag.id, "Exatas");

    expect(result).toEqual({ ok: false, reason: "tag-nao-encontrada" });
    expect(await getTagNames(otherId)).toEqual(["Prova"]);
  });

  it("recusa id que não é uuid como Tag inexistente", async () => {
    const ownerId = await createUser();

    await expect(updateTagName(ownerId, "nao-e-uuid", "Prova")).resolves.toEqual({ ok: false, reason: "tag-nao-encontrada" });
  });

  it("recusa nome vazio", async () => {
    const ownerId = await createUser();
    const tag = await createTagRow(ownerId, "Prova");

    await expect(updateTagName(ownerId, tag.id, "  ")).resolves.toEqual({ ok: false, reason: "nome-da-tag-vazio" });
  });
});

describe("deleteTag", () => {
  it("tira a Tag de todos os Stoods e mantém os Stoods", async () => {
    const ownerId = await createUser();
    const calculus = await createStood(ownerId, "Cálculo I");
    const physics = await createStood(ownerId, "Física II");
    const tag = await createTagRow(ownerId, "Prova", [calculus.id, physics.id]);

    const result = await deleteTag(ownerId, tag.id);

    const ownedStoods = await db.select({ id: stoods.id }).from(stoods).where(eq(stoods.ownerId, ownerId));
    expect(result).toEqual({ ok: true });
    expect([await getTagNames(ownerId), await getStoodTagIds(calculus.id), ownedStoods.length]).toEqual([[], [], 2]);
  });

  it("não apaga a Tag de outro Usuário", async () => {
    const otherId = await createUser();
    const tag = await createTagRow(otherId, "Prova");
    const ownerId = await createUser();

    const result = await deleteTag(ownerId, tag.id);

    expect(result).toEqual({ ok: false, reason: "tag-nao-encontrada" });
    expect(await getTagNames(otherId)).toEqual(["Prova"]);
  });
});

describe("getTags", () => {
  it("devolve as Tags do dono em ordem alfabética, com quantos Stoods cada uma marca", async () => {
    const ownerId = await createUser();
    const calculus = await createStood(ownerId, "Cálculo I");
    const physics = await createStood(ownerId, "Física II");
    await createTagRow(ownerId, "prova", [calculus.id, physics.id]);
    await createTagRow(ownerId, "Álgebra");
    await createTagRow(ownerId, "Exatas", [physics.id]);

    await expect(getTags(ownerId)).resolves.toMatchObject([
      { name: "Álgebra", stoodCount: 0 },
      { name: "Exatas", stoodCount: 1 },
      { name: "prova", stoodCount: 2 },
    ]);
  });

  it("não devolve as Tags de outro Usuário", async () => {
    const otherId = await createUser();
    await createTagRow(otherId, "Prova");
    const ownerId = await createUser();

    await expect(getTags(ownerId)).resolves.toEqual([]);
  });
});

describe("updateStoodTags", () => {
  it("troca as Tags do Stood pela lista escolhida, criando as Tags novas", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const exams = await createTagRow(ownerId, "Prova", [stood.id]);
    const sciences = await createTagRow(ownerId, "Exatas");

    const result = await updateStoodTagsInTransaction(ownerId, stood.id, { tagIds: [sciences.id], newTagNames: ["Semestre 1"] });

    const [semester] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.ownerId, ownerId), eq(tags.name, "Semestre 1")));
    expect(result).toEqual({ ok: true, tags: [{ id: sciences.id, name: "Exatas" }, { id: semester?.id, name: "Semestre 1" }] });
    expect(await getStoodTagIds(stood.id)).toEqual([sciences.id, semester?.id].sort());
    expect(await getTagNames(ownerId)).toEqual(["Exatas", "Prova", "Semestre 1"]);
    expect(exams.id).not.toBe(semester?.id);
  });

  it("usa a Tag existente quando o nome novo já existe com outras maiúsculas", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const exams = await createTagRow(ownerId, "Prova");

    await updateStoodTagsInTransaction(ownerId, stood.id, { tagIds: [], newTagNames: ["prova"] });

    expect([await getStoodTagIds(stood.id), await getTagNames(ownerId)]).toEqual([[exams.id], ["Prova"]]);
  });

  it("ignora a Tag que não existe mais e salva o resto", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const exams = await createTagRow(ownerId, "Prova");
    const deleted = await createTagRow(ownerId, "Exatas");
    await db.delete(tags).where(eq(tags.id, deleted.id));

    const result = await updateStoodTagsInTransaction(ownerId, stood.id, {
      tagIds: [exams.id, deleted.id, "nao-e-uuid"],
      newTagNames: [],
    });

    expect(result).toEqual({ ok: true, tags: [{ id: exams.id, name: "Prova" }] });
    expect(await getStoodTagIds(stood.id)).toEqual([exams.id]);
  });

  it("aceita a 10ª Tag do Stood", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const ownedTags = await createManyTags(ownerId, MAX_TAGS_PER_STOOD);

    await expect(
      updateStoodTagsInTransaction(ownerId, stood.id, { tagIds: ownedTags.map((tag) => tag.id), newTagNames: [] }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("recusa a 11ª Tag do Stood sem mudar as Tags", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const ownedTags = await createManyTags(ownerId, MAX_TAGS_PER_STOOD);

    const result = await updateStoodTagsInTransaction(ownerId, stood.id, {
      tagIds: ownedTags.map((tag) => tag.id),
      newTagNames: ["Prova"],
    });

    expect(result).toEqual({ ok: false, reason: "limite-de-tags-do-stood" });
    expect(await getStoodTagIds(stood.id)).toEqual([]);
  });

  it("recusa criar Tag nova além de 100 Tags do Usuário", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createManyTags(ownerId, MAX_TAGS_PER_USER);

    await expect(updateStoodTagsInTransaction(ownerId, stood.id, { tagIds: [], newTagNames: ["Prova"] })).resolves.toEqual({
      ok: false,
      reason: "limite-de-tags",
    });
  });

  it("recusa nome de Tag nova acima de 30 caracteres", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(
      updateStoodTagsInTransaction(ownerId, stood.id, { tagIds: [], newTagNames: ["a".repeat(31)] }),
    ).resolves.toEqual({ ok: false, reason: "nome-da-tag-longo" });
  });

  it("ignora a Tag de outro Usuário", async () => {
    const otherId = await createUser();
    const otherTag = await createTagRow(otherId, "Prova");
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await updateStoodTagsInTransaction(ownerId, stood.id, { tagIds: [otherTag.id], newTagNames: [] });

    expect(await getStoodTagIds(stood.id)).toEqual([]);
  });
});

// Sem esperar, outra aba leria a lista de Tags antes da mudança e falharia ao gravar o Stood
describe.each([
  ["updateTagName", (ownerId: string, tagId: string) => updateTagName(ownerId, tagId, "Exame")],
  ["deleteTag", deleteTag],
])("%s em concorrência", (_name, write) => {
  it("espera a gravação de Tags do mesmo Usuário que já começou", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo");
    const tag = await createTagRow(ownerId, "Prova");

    const order = await trackWriteOrder(
      (tx) => updateStoodTags(tx, ownerId, stood.id, { tagIds: [], newTagNames: [] }),
      () => write(ownerId, tag.id),
    );

    expect(order).toEqual(["primeira gravação", "segunda gravação"]);
  });
});

describe("updateTagStoods", () => {
  it("troca os Stoods marcados pela Tag pela lista escolhida", async () => {
    const ownerId = await createUser();
    const calculus = await createStood(ownerId, "Cálculo I");
    const physics = await createStood(ownerId, "Física II");
    const chemistry = await createStood(ownerId, "Química geral");
    const tag = await createTagRow(ownerId, "Prova", [calculus.id, physics.id]);

    const result = await updateTagStoods(ownerId, tag.id, [physics.id, chemistry.id]);

    expect(result).toEqual({ ok: true });
    expect([await getStoodTagIds(calculus.id), await getStoodTagIds(physics.id), await getStoodTagIds(chemistry.id)]).toEqual([
      [],
      [tag.id],
      [tag.id],
    ]);
  });

  it("mantém a Tag no Stood que já tem 10 Tags, incluindo esta", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const ownedTags = await createManyTags(ownerId, MAX_TAGS_PER_STOOD);
    await db.insert(stoodTags).values(ownedTags.map((tag) => ({ ownerId, stoodId: stood.id, tagId: tag.id })));

    await expect(updateTagStoods(ownerId, ownedTags[0].id, [stood.id])).resolves.toEqual({ ok: true });
  });

  it("ignora o Stood de outro Usuário e id que não é uuid", async () => {
    const otherId = await createUser();
    const otherStood = await createStood(otherId, "Cálculo I");
    const ownerId = await createUser();
    const tag = await createTagRow(ownerId, "Prova");

    const result = await updateTagStoods(ownerId, tag.id, [otherStood.id, "nao-e-uuid"]);

    expect(result).toEqual({ ok: true });
    expect(await getStoodTagIds(otherStood.id)).toEqual([]);
  });

  it("recusa marcar um Stood que já tem 10 Tags, sem mudar nenhum Stood", async () => {
    const ownerId = await createUser();
    const full = await createStood(ownerId, "Cálculo I");
    const other = await createStood(ownerId, "Física II");
    const ownedTags = await createManyTags(ownerId, MAX_TAGS_PER_STOOD);
    await db.insert(stoodTags).values(ownedTags.map((tag) => ({ ownerId, stoodId: full.id, tagId: tag.id })));
    const tag = await createTagRow(ownerId, "Prova");

    const result = await updateTagStoods(ownerId, tag.id, [full.id, other.id]);

    expect(result).toEqual({ ok: false, reason: "limite-de-tags-do-stood" });
    expect(await getStoodTagIds(other.id)).toEqual([]);
  });

  it("trata a Tag de outro Usuário como inexistente", async () => {
    const otherId = await createUser();
    const otherTag = await createTagRow(otherId, "Prova");
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(updateTagStoods(ownerId, otherTag.id, [stood.id])).resolves.toEqual({ ok: false, reason: "tag-nao-encontrada" });
  });
});

describe("tabelas de Tag", () => {
  it("apaga Tags e ligações junto com o Usuário", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createTagRow(ownerId, "Prova", [stood.id]);

    await db.delete(users).where(eq(users.id, ownerId));

    expect([await getTagNames(ownerId), await getStoodTagIds(stood.id)]).toEqual([[], []]);
  });

  it("recusa no banco ligar o Stood de um Usuário à Tag de outro", async () => {
    const otherId = await createUser();
    const otherTag = await createTagRow(otherId, "Prova");
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(db.insert(stoodTags).values({ ownerId, stoodId: stood.id, tagId: otherTag.id })).rejects.toThrow();
  });

  it("recusa no banco nome repetido sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    await createTagRow(ownerId, "Prova");

    await expect(db.insert(tags).values({ ownerId, name: "PROVA" })).rejects.toThrow();
  });

  it.each([
    ["com espaço nas pontas", " Prova"],
    ["acima de 30 caracteres", "a".repeat(31)],
  ])("recusa no banco nome %s", async (_case, name) => {
    const ownerId = await createUser();

    await expect(db.insert(tags).values({ ownerId, name })).rejects.toThrow();
  });
});
