import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { files, stoods } from "@/db/schema";
import { MAX_VIDEO_WINDOWS, parseStoredWindows } from "@/lib/board/windows";

export type UpdateBoardWindowsResult =
  | { ok: true }
  | { ok: false; reason: "layout-invalido" | "arquivo-nao-encontrado" | "stood-nao-encontrado" };

const uuidSchema = z.uuid();

// Grava as Janelas abertas do Quadro; só entra Janela de Arquivo do próprio Stood e do dono, dentro dos limites
export async function updateBoardWindows(
  ownerId: string,
  input: { stoodId: string; windows: unknown },
): Promise<UpdateBoardWindowsResult> {
  if (!uuidSchema.safeParse(input.stoodId).success) return { ok: false, reason: "stood-nao-encontrado" };
  const windows = parseStoredWindows(input.windows);
  if (!windows) return { ok: false, reason: "layout-invalido" };

  const windowFiles = await getWindowFiles(ownerId, input.stoodId, windows.map((window) => window.fileId));
  if (windowFiles.length !== windows.length) return { ok: false, reason: "arquivo-nao-encontrado" };
  const videos = windowFiles.filter((file) => file.type === "video").length;
  if (videos > MAX_VIDEO_WINDOWS) return { ok: false, reason: "layout-invalido" };

  const updated = await db
    .update(stoods)
    .set({ boardWindows: windows })
    .where(and(eq(stoods.id, input.stoodId), eq(stoods.ownerId, ownerId)))
    .returning({ id: stoods.id });
  return updated.length > 0 ? { ok: true } : { ok: false, reason: "stood-nao-encontrado" };
}

async function getWindowFiles(ownerId: string, stoodId: string, fileIds: string[]) {
  if (fileIds.length === 0) return [];
  return db
    .select({ type: files.type })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), eq(files.stoodId, stoodId), inArray(files.id, fileIds)));
}
