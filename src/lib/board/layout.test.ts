import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { stoods } from "@/db/schema";
import { updateBoardWindows } from "@/lib/board/layout";
import type { StoredBoardWindow } from "@/lib/board/windows";
import { createFile, createStood, createUser } from "@/test/db";

const VIDEO_ID = "dQw4w9WgXcQ";
const RECT = { x: 24, y: 24, width: 380, height: 380 };

describe("updateBoardWindows", () => {
  it("grava as Janelas abertas no Stood", async () => {
    const { ownerId, stoodId, fileIds } = await createStoodWithNotes(2);
    const windows = [buildWindow(fileIds[0], 1), { ...buildWindow(fileIds[1], 2), restoreRect: RECT }];

    const result = await updateBoardWindows(ownerId, { stoodId, windows });

    expect({ result, stored: await getStoredWindows(stoodId) }).toEqual({ result: { ok: true }, stored: windows });
  });

  it("grava o Quadro vazio quando todas as Janelas fecham", async () => {
    const { ownerId, stoodId, fileIds } = await createStoodWithNotes(1);
    await updateBoardWindows(ownerId, { stoodId, windows: [buildWindow(fileIds[0], 1)] });

    await updateBoardWindows(ownerId, { stoodId, windows: [] });

    expect(await getStoredWindows(stoodId)).toEqual([]);
  });

  it("aceita 2 Vídeos abertos", async () => {
    const { ownerId, stoodId } = await createStoodWithNotes(0);
    const videos = await Promise.all(
      ["Aula 1", "Aula 2"].map((name) => createFile(ownerId, stoodId, { type: "video", name, content: VIDEO_ID })),
    );

    await expect(
      updateBoardWindows(ownerId, { stoodId, windows: videos.map((video, index) => buildWindow(video.id, index + 1)) }),
    ).resolves.toEqual({ ok: true });
  });

  it("recusa o 3º Vídeo aberto", async () => {
    const { ownerId, stoodId } = await createStoodWithNotes(0);
    const videos = await Promise.all(
      ["Aula 1", "Aula 2", "Aula 3"].map((name) => createFile(ownerId, stoodId, { type: "video", name, content: VIDEO_ID })),
    );

    await expect(
      updateBoardWindows(ownerId, { stoodId, windows: videos.map((video, index) => buildWindow(video.id, index + 1)) }),
    ).resolves.toEqual({ ok: false, reason: "layout-invalido" });
  });

  it("recusa Janelas fora do formato sem gravar", async () => {
    const { ownerId, stoodId, fileIds } = await createStoodWithNotes(1);
    await updateBoardWindows(ownerId, { stoodId, windows: [buildWindow(fileIds[0], 1)] });

    const result = await updateBoardWindows(ownerId, { stoodId, windows: [{ fileId: fileIds[0], rect: "grande" }] });

    expect({ result, stored: await getStoredWindows(stoodId) }).toEqual({
      result: { ok: false, reason: "layout-invalido" },
      stored: [buildWindow(fileIds[0], 1)],
    });
  });

  it("recusa Janela de um Arquivo de outro Stood do mesmo dono", async () => {
    const { ownerId, stoodId } = await createStoodWithNotes(0);
    const otherStood = await createStood(ownerId, "Física I");
    const otherFile = await createFile(ownerId, otherStood.id, { type: "note", name: "Vetores", content: "" });

    await expect(updateBoardWindows(ownerId, { stoodId, windows: [buildWindow(otherFile.id, 1)] })).resolves.toEqual({
      ok: false,
      reason: "arquivo-nao-encontrado",
    });
  });

  it("recusa Janela de um Arquivo de outro Usuário", async () => {
    const { fileIds: otherFileIds } = await createStoodWithNotes(1);
    const { ownerId, stoodId } = await createStoodWithNotes(0);

    await expect(updateBoardWindows(ownerId, { stoodId, windows: [buildWindow(otherFileIds[0], 1)] })).resolves.toEqual({
      ok: false,
      reason: "arquivo-nao-encontrado",
    });
  });

  it("não grava no Stood de outro Usuário", async () => {
    const other = await createStoodWithNotes(1);
    const ownerId = await createUser();

    const result = await updateBoardWindows(ownerId, { stoodId: other.stoodId, windows: [] });

    expect({ result, stored: await getStoredWindows(other.stoodId) }).toEqual({
      result: { ok: false, reason: "stood-nao-encontrado" },
      stored: [],
    });
  });

  it("recusa id de Stood que não é uuid", async () => {
    const ownerId = await createUser();

    await expect(updateBoardWindows(ownerId, { stoodId: "nao-e-uuid", windows: [] })).resolves.toEqual({
      ok: false,
      reason: "stood-nao-encontrado",
    });
  });
});

describe("constraint de Janelas do Stood", () => {
  it("o banco recusa mais de 10 Janelas gravadas direto", async () => {
    const { stoodId } = await createStoodWithNotes(0);
    const windows = Array.from({ length: 11 }, (_, index) => ({ fileId: String(index) }));

    await expect(
      db.update(stoods).set({ boardWindows: sql`${JSON.stringify(windows)}::jsonb` }).where(eq(stoods.id, stoodId)),
    ).rejects.toMatchObject({ cause: { constraint: "stoods_board_windows_check" } });
  });

  it("o banco recusa Janelas que não são lista", async () => {
    const { stoodId } = await createStoodWithNotes(0);

    await expect(
      db.update(stoods).set({ boardWindows: sql`'{}'::jsonb` }).where(eq(stoods.id, stoodId)),
    ).rejects.toMatchObject({ cause: { constraint: "stoods_board_windows_check" } });
  });
});

async function createStoodWithNotes(total: number) {
  const ownerId = await createUser();
  const stood = await createStood(ownerId, "Cálculo I");
  const notes = await Promise.all(
    Array.from({ length: total }, (_, index) =>
      createFile(ownerId, stood.id, { type: "note", name: `Nota ${index + 1}`, content: "" }),
    ),
  );
  return { ownerId, stoodId: stood.id, fileIds: notes.map((note) => note.id) };
}

function buildWindow(fileId: string, z: number): StoredBoardWindow {
  return { fileId, rect: RECT, restoreRect: null, z };
}

async function getStoredWindows(stoodId: string) {
  const [row] = await db.select({ boardWindows: stoods.boardWindows }).from(stoods).where(eq(stoods.id, stoodId)).limit(1);
  return row.boardWindows;
}
