// Leitura do link do YouTube e nome sugerido do Vídeo, sem I/O: o modal do client também usa
// Caminho relativo com extensão, porque o seed de dev roda src/db/schema.ts direto no Node
import { MAX_NAME_LENGTH } from "../stood/details.ts";

// Fonte única do formato do id: src/db/schema.ts monta o CHECK de files.content com este padrão
export const YOUTUBE_VIDEO_ID_PATTERN = "^[A-Za-z0-9_-]{11}$";

const VIDEO_ID = new RegExp(YOUTUBE_VIDEO_ID_PATTERN);
const WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const EMBED_HOSTS = new Set([...WATCH_HOSTS, "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const SHORT_HOST = "youtu.be";
// Caminhos em que o id vem logo depois do prefixo, como /shorts/<id>
const ID_PATH_PREFIXES = new Set(["shorts", "embed", "live", "v"]);
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const PATH_SEPARATORS = /[/\\]/g;
const WHITESPACE_RUNS = /\s+/g;
const ELLIPSIS = "…";

// Player sem cookies do YouTube; rel=0 limita os vídeos sugeridos ao canal do próprio vídeo
export function buildYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function isYouTubeVideoId(value: string) {
  return VIDEO_ID.test(value);
}

// Aceita os formatos que o YouTube compartilha: watch, youtu.be, Shorts, embed e live, com ou sem https://
export function parseYouTubeVideoId(input: string): string | undefined {
  const url = parseHttpUrl(input.trim());
  if (!url) return undefined;

  const host = url.hostname.toLowerCase();
  const [first = "", second = ""] = url.pathname.split("/").filter(Boolean);
  const candidate =
    host === SHORT_HOST
      ? first
      : WATCH_HOSTS.has(host) && first === "watch"
        ? url.searchParams.get("v")
        : EMBED_HOSTS.has(host) && ID_PATH_PREFIXES.has(first)
          ? second
          : null;
  return candidate && isYouTubeVideoId(candidate) ? candidate : undefined;
}

// Título do vídeo ajustado às regras de nome de Arquivo, para o Usuário só confirmar
export function buildVideoFileName(title: string) {
  const cleaned = title.replace(PATH_SEPARATORS, "-").replace(WHITESPACE_RUNS, " ").trim();
  if (cleaned.length <= MAX_NAME_LENGTH) return cleaned;
  return `${buildCutAtLength(cleaned, MAX_NAME_LENGTH - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
}

function parseHttpUrl(input: string) {
  const withScheme = SCHEME.test(input) ? input : `https://${input}`;
  if (!URL.canParse(withScheme)) return undefined;
  const url = new URL(withScheme);
  return url.protocol === "https:" || url.protocol === "http:" ? url : undefined;
}

// Corta por caractere, e não por unidade UTF-16, para não partir um emoji ao meio
function buildCutAtLength(text: string, maxLength: number) {
  let cut = "";
  for (const char of text) {
    if (cut.length + char.length > maxLength) break;
    cut += char;
  }
  return cut;
}
