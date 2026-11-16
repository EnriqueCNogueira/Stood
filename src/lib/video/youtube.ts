import "server-only";

import { z } from "zod";
import { isYouTubeVideoId } from "@/lib/video/link";

export type YouTubeVideo = { id: string; title: string; channelName: string; thumbnailUrl: string };

export type FetchYouTubeVideoResult =
  | { ok: true; video: YouTubeVideo }
  | { ok: false; reason: "video-nao-encontrado" | "video-indisponivel" | "youtube-fora-do-ar" };

const OEMBED_URL = "https://www.youtube.com/oembed";
const WATCH_URL = "https://www.youtube.com/watch";
const TIMEOUT_MS = 5_000;
// O oEmbed responde 400 para id que não existe, e 401 ou 403 para vídeo privado ou que não pode ser incorporado
const NOT_FOUND_STATUSES = new Set([400, 404]);
const UNAVAILABLE_STATUSES = new Set([401, 403]);

const oembedSchema = z.object({
  title: z.string(),
  author_name: z.string(),
  thumbnail_url: z.url({ protocol: /^https$/ }),
});

// Título, canal e miniatura pelo oEmbed, que não pede chave; só o id sai do servidor, nada do Usuário
export async function fetchYouTubeVideo(videoId: string): Promise<FetchYouTubeVideoResult> {
  if (!isYouTubeVideoId(videoId)) return { ok: false, reason: "video-nao-encontrado" };

  try {
    const response = await fetch(buildOembedUrl(videoId), { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (NOT_FOUND_STATUSES.has(response.status)) return { ok: false, reason: "video-nao-encontrado" };
    if (UNAVAILABLE_STATUSES.has(response.status)) return { ok: false, reason: "video-indisponivel" };
    if (!response.ok) {
      console.error("youtube oembed failed", { status: response.status });
      return { ok: false, reason: "youtube-fora-do-ar" };
    }

    const parsed = oembedSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error("youtube oembed unexpected payload");
      return { ok: false, reason: "youtube-fora-do-ar" };
    }
    const { title, author_name, thumbnail_url } = parsed.data;
    return { ok: true, video: { id: videoId, title, channelName: author_name, thumbnailUrl: thumbnail_url } };
  } catch (error) {
    // Rede, prazo esgotado ou corpo que não é JSON
    console.error("youtube oembed request failed", { error: error instanceof Error ? error.name : "unknown" });
    return { ok: false, reason: "youtube-fora-do-ar" };
  }
}

function buildOembedUrl(videoId: string) {
  const params = new URLSearchParams({ format: "json", url: `${WATCH_URL}?v=${videoId}` });
  return `${OEMBED_URL}?${params}`;
}
