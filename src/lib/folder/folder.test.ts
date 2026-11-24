import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { createFolder } from "@/lib/folder/folder";
import { createFolder as createFolderRow, createStood, createUser } from "@/test/db";

describe("createFolder", () => {
  it("cria a Pasta na raiz do Stood e devolve no formato da árvore", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    const result = await createFolder(ownerId, { stoodId: stood.id, parentId: null, name: "Aulas" });

    expect(result).toStrictEqual({ ok: true, folder: { kind: "folder", id: expect.any(String), name: "Aulas", children: [] } });
  });

  it("cria a Pasta dentro da Pasta pedida", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const parent = await createFolderRow(ownerId, stood.id, { name: "Aulas" });

    const result = await createFolder(ownerId, { stoodId: stood.id, parentId: parent.id, name: "Semana 1" });

    expect(result.ok && (await getParentId(result.folder.id))).toBe(parent.id);
  });

  it("recusa o nome de outra Pasta no mesmo lugar, sem diferenciar maiúsculas", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    await createFolderRow(ownerId, stood.id, { name: "Aulas" });

    await expect(createFolder(ownerId, { stoodId: stood.id, parentId: null, name: "aulas" })).resolves.toEqual({
      ok: false,
      reason: "nome-repetido",
    });
  });

  it("recusa o nome inválido", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");

    await expect(createFolder(ownerId, { stoodId: stood.id, parentId: null, name: " " })).resolves.toEqual({
      ok: false,
      reason: "nome-vazio",
    });
  });

  it("recusa a Pasta pai de outro Stood como inexistente", async () => {
    const ownerId = await createUser();
    const stood = await createStood(ownerId, "Cálculo I");
    const other = await createStood(ownerId, "Física II");
    const parent = await createFolderRow(ownerId, other.id, { name: "Aulas" });

    await expect(createFolder(ownerId, { stoodId: stood.id, parentId: parent.id, name: "Semana 1" })).resolves.toEqual({
      ok: false,
      reason: "pasta-nao-encontrada",
    });
  });

  it("recusa o Stood de outro Usuário como inexistente", async () => {
    const stood = await createStood(await createUser(), "Cálculo I");

    await expect(createFolder(await createUser(), { stoodId: stood.id, parentId: null, name: "Aulas" })).resolves.toEqual({
      ok: false,
      reason: "stood-nao-encontrado",
    });
  });
});

async function getParentId(folderId: string) {
  const [row] = await db.select({ parentId: folders.parentId }).from(folders).where(eq(folders.id, folderId)).limit(1);
  return row?.parentId;
}
