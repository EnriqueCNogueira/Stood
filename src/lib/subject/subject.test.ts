import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { files, stoods } from "@/db/schema";
import { buildSortedByName } from "@/lib/stood/tree";
import { buildSubjectTree, SUBJECTS } from "@/lib/subject/catalog";
import { createStoodFromSubject } from "@/lib/subject/subject";
import { createStood as createStoodRow, createUser } from "@/test/db";

const subject = SUBJECTS[0];

describe("createStoodFromSubject", () => {
  it("cria o Stood do dono com o nome e a descrição escolhidos", async () => {
    const ownerId = await createUser();

    const result = await createStoodFromSubject(ownerId, {
      subjectSlug: subject.slug,
      name: "Meu Cálculo",
      description: "Para a P1",
    });

    expect(result.ok && (await getStoodRow(result.id))).toMatchObject({
      ownerId,
      name: "Meu Cálculo",
      description: "Para a P1",
    });
  });

  it("copia para a raiz do Stood, em nome do dono, exatamente os Vídeos da Matéria", async () => {
    const ownerId = await createUser();

    const result = await createStoodFromSubject(ownerId, { subjectSlug: subject.slug, name: subject.name, description: "" });

    const expected = buildSubjectTree(subject).map((file) => ({ name: file.name, content: file.videoId, folderId: null }));
    expect(result.ok && buildSortedByName(await getFileRows(ownerId, result.id))).toEqual(buildSortedByName(expected));
  });

  it("aceita o nome que outro Usuário já usa para a mesma Matéria", async () => {
    const otherId = await createUser();
    await createStoodFromSubject(otherId, { subjectSlug: subject.slug, name: subject.name, description: "" });
    const ownerId = await createUser();

    await expect(
      createStoodFromSubject(ownerId, { subjectSlug: subject.slug, name: subject.name, description: "" }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("recusa nome que o dono já usa sem deixar Stood nem Arquivo soltos", async () => {
    const ownerId = await createUser();
    await createStoodRow(ownerId, subject.name);

    const result = await createStoodFromSubject(ownerId, { subjectSlug: subject.slug, name: subject.name, description: "" });

    expect(result).toEqual({ ok: false, reason: "nome-repetido" });
    expect(await db.select({ id: files.id }).from(files).where(eq(files.ownerId, ownerId))).toEqual([]);
  });

  it.each([
    ["vazio", "", "nome-vazio"],
    ["com /", "Cálculo/1", "nome-com-separador"],
    ["com 51 caracteres", "a".repeat(51), "nome-longo"],
  ])("recusa nome %s", async (_case, name, reason) => {
    const ownerId = await createUser();

    await expect(createStoodFromSubject(ownerId, { subjectSlug: subject.slug, name, description: "" })).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it.each(["", "materia-que-nao-existe", "__proto__"])("recusa a Matéria %j, que não existe", async (subjectSlug) => {
    const ownerId = await createUser();

    await expect(createStoodFromSubject(ownerId, { subjectSlug, name: "Cálculo", description: "" })).resolves.toEqual({
      ok: false,
      reason: "materia-nao-encontrada",
    });
  });
});

async function getStoodRow(id: string) {
  const [stood] = await db.select().from(stoods).where(eq(stoods.id, id)).limit(1);
  return stood;
}

// Todos os Arquivos do Stood, de qualquer tipo, para um Arquivo a mais ou de outro tipo aparecer na comparação
async function getFileRows(ownerId: string, stoodId: string) {
  return db
    .select({ name: files.name, content: files.content, folderId: files.folderId })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), eq(files.stoodId, stoodId)));
}
