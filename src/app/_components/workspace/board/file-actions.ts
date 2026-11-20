"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  type CreateDrawingFileResult,
  type CreateImageFileResult,
  type CreateNoteFileResult,
  type CreateVideoFileResult,
  type UpdateDrawingContentResult,
  type UpdateNoteContentResult,
  createDrawingFile,
  createImageFile,
  createNoteFile,
  createVideoFile,
  updateDrawingContent,
  updateNoteContent,
} from "@/lib/file/file";
import { MAX_IMAGE_BYTES } from "@/lib/file/image";
import { type FetchYouTubeVideoResult, fetchYouTubeVideo } from "@/lib/video/youtube";

// As regras de nome e de id ficam no Service; aqui só se confere o formato da entrada
const previewInputSchema = z.object({ videoId: z.string() });
const createVideoInputSchema = z.object({ stoodId: z.string(), videoId: z.string(), name: z.string() });
const createNamedFileInputSchema = z.object({ stoodId: z.string(), name: z.string() });
const updateContentInputSchema = z.object({ fileId: z.string(), content: z.string() });
const createImageInputSchema = z.object({ stoodId: z.string(), name: z.string(), image: z.instanceof(File) });

type InvalidInput = { ok: false; reason: "entrada-invalida" };
export type CreateImageFileActionResult = CreateImageFileResult | InvalidInput;
export type FetchVideoPreviewActionResult = FetchYouTubeVideoResult | InvalidInput;
export type CreateVideoFileActionResult = CreateVideoFileResult | InvalidInput;
export type CreateNoteFileActionResult = CreateNoteFileResult | InvalidInput;
export type UpdateNoteContentActionResult = UpdateNoteContentResult | InvalidInput;
export type CreateDrawingFileActionResult = CreateDrawingFileResult | InvalidInput;
export type UpdateDrawingContentActionResult = UpdateDrawingContentResult | InvalidInput;

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
  const parsed = createNamedFileInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createNoteFile(user.id, parsed.data);
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}

// Chamada pelo salvamento automático da Janela; sem revalidar, porque a Biblioteca não mostra o texto
export async function updateNoteContentAction(input: unknown): Promise<UpdateNoteContentActionResult> {
  const user = await requireSession();
  const parsed = updateContentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  return updateNoteContent(user.id, parsed.data);
}

// Recebe FormData porque o arquivo vai como multipart; o limite de corpo está em next.config.ts
export async function createImageFileAction(formData: unknown): Promise<CreateImageFileActionResult> {
  const user = await requireSession();
  if (!(formData instanceof FormData)) return { ok: false, reason: "entrada-invalida" };
  const parsed = createImageInputSchema.safeParse({
    stoodId: formData.get("stoodId"),
    name: formData.get("name"),
    image: formData.get("image"),
  });
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const { stoodId, name, image } = parsed.data;
  // Recusa antes de ler os bytes para a memória
  if (image.size > MAX_IMAGE_BYTES) return { ok: false, reason: "imagem-grande" };
  const result = await createImageFile(user.id, { stoodId, name, bytes: new Uint8Array(await image.arrayBuffer()) });
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}

export async function createDrawingFileAction(input: unknown): Promise<CreateDrawingFileActionResult> {
  const user = await requireSession();
  const parsed = createNamedFileInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  const result = await createDrawingFile(user.id, parsed.data);
  if (result.ok) revalidatePath("/biblioteca");
  return result;
}

// Chamada pelo salvamento automático do Desenho; sem revalidar, porque a Biblioteca não mostra a cena
export async function updateDrawingContentAction(input: unknown): Promise<UpdateDrawingContentActionResult> {
  const user = await requireSession();
  const parsed = updateContentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "entrada-invalida" };

  return updateDrawingContent(user.id, parsed.data);
}
