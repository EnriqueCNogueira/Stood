import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { files } from "@/db/schema";
import { createVideoFile } from "@/lib/file/file";
import { createFile, createStood, createUser } from "@/test/db";

const VIDEO_ID = "dQw4w9WgXcQ";

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
