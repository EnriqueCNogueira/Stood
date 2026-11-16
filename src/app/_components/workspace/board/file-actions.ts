"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  type CreateNoteFileResult,
  type CreateVideoFileResult,
  type UpdateNoteContentResult,
  createNoteFile,
  createVideoFile,
  updateNoteContent,
} from "@/lib/file/file";
import { type FetchYouTubeVideoResult, fetchYouTubeVideo } from "@/lib/video/youtube";

// As regras de nome e de id ficam no Service; aqui só se confere o formato da entrada
const previewInputSchema = z.object({ videoId: z.string() });
const createVideoInputSchema = z.object({ stoodId: z.string(), videoId: z.string(), name: z.string() });
const createNoteInputSchema = z.object({ stoodId: z.string(), name: z.string() });
const updateNoteInputSchema = z.object({ fileId: z.string(), content: z.string() });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type FetchVideoPreviewActionResult = FetchYouTubeVideoResult | InvalidInput;
export type CreateVideoFileActionResult = CreateVideoFileResult | InvalidInput;
export type CreateNoteFileActionResult = CreateNoteFileResult | InvalidInput;
export type UpdateNoteContentActionResult = UpdateNoteContentResult | InvalidInput;

// Preview do modal de Vídeo: a sessão evita que o servidor vire proxy aberto do YouTube
export async function fetchVideoPreviewAction(input: unknown): Promise<FetchVideoPreviewActionResult> {
  await requireSession();
  const parsed = previewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  return fetchYouTubeVideo(parsed.data.videoId);
}

// Sem revalidar o Quadro: ele põe o Arquivo na barra lateral, e uma nova renderização gravaria last_opened_at
export async function createVideoFileAction(input: unknown): Promise<CreateVideoFileActionResult> {
  const user = await requireSession();
  const parsed = createVideoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createVideoFile(user.id, parsed.data);
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}

export async function createNoteFileAction(input: unknown): Promise<CreateNoteFileActionResult> {
  const user = await requireSession();
  const parsed = createNoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createNoteFile(user.id, parsed.data);
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}

// Chamada pelo salvamento automático da Janela; sem revalidar, porque a Biblioteca não mostra o texto
export async function updateNoteContentAction(input: unknown): Promise<UpdateNoteContentActionResult> {
  const user = await requireSession();
  const parsed = updateNoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  return updateNoteContent(user.id, parsed.data);
}
