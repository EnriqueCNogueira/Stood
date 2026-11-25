// Regras de Apelido, Bio, Humor e Foto sem I/O: o Service, o client e as CHECK do schema usam este arquivo.
// Sem import com @/, porque o schema importa este arquivo direto no Node.
import { parseImageType } from "../file/image.ts";
import { buildFirstName } from "../library/library.ts";

export const MAX_NICKNAME_LENGTH = 30;
export const MAX_BIO_LENGTH = 160;
// A Foto é reduzida no navegador a um quadrado deste lado, em JPEG
export const PHOTO_SIDE_PIXELS = 256;
export const MAX_PHOTO_BYTES = 200 * 1024;

// Humores do dia, em substantivos para não supor o gênero de ninguém
export const MOODS = [
  { id: "motivation", emoji: "😎", label: "Motivação" },
  { id: "concentration", emoji: "🎯", label: "Concentração" },
  { id: "excitement", emoji: "🥳", label: "Animação" },
  { id: "calm", emoji: "😌", label: "Tranquilidade" },
  { id: "doubts", emoji: "🤔", label: "Dúvidas" },
  { id: "tiredness", emoji: "😴", label: "Cansaço" },
  { id: "pressure", emoji: "😬", label: "Pressão" },
  { id: "discouragement", emoji: "😕", label: "Desânimo" },
] as const;
export type Mood = (typeof MOODS)[number];
export type MoodId = Mood["id"];
export const MOOD_IDS = MOODS.map(({ id }) => id) as [MoodId, ...MoodId[]];

export type NicknameReason = "apelido-longo" | "apelido-com-controle";
export type BioReason = "bio-longa" | "bio-com-controle";
export type PhotoReason = "foto-vazia" | "foto-grande" | "foto-invalida";

// Quebra de linha e caractere invisível de controle, que o banco também recusa
const CONTROL_CHARACTER = /[\p{Cc}\p{Zl}\p{Zp}]/u;

// Vazio quer dizer sem Apelido
export function validateNickname(nickname: string): { ok: true; nickname: string | null } | { ok: false; reason: NicknameReason } {
  const trimmed = nickname.trim();
  if (trimmed.length > MAX_NICKNAME_LENGTH) return { ok: false, reason: "apelido-longo" };
  if (CONTROL_CHARACTER.test(trimmed)) return { ok: false, reason: "apelido-com-controle" };
  return { ok: true, nickname: trimmed || null };
}

// Vazia quer dizer sem Bio
export function validateBio(bio: string): { ok: true; bio: string | null } | { ok: false; reason: BioReason } {
  const trimmed = bio.trim();
  if (trimmed.length > MAX_BIO_LENGTH) return { ok: false, reason: "bio-longa" };
  if (CONTROL_CHARACTER.test(trimmed)) return { ok: false, reason: "bio-com-controle" };
  return { ok: true, bio: trimmed || null };
}

// O navegador sempre envia JPEG; o formato vem dos bytes, e não do tipo que ele informa
export function validatePhoto(bytes: Uint8Array): { ok: true } | { ok: false; reason: PhotoReason } {
  if (bytes.length === 0) return { ok: false, reason: "foto-vazia" };
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, reason: "foto-grande" };
  return parseImageType(bytes) === "image/jpeg" ? { ok: true } : { ok: false, reason: "foto-invalida" };
}

export function findMood(id: string): Mood | undefined {
  return MOODS.find((mood) => mood.id === id);
}

// O Humor vale só no dia em que foi marcado, no horário de Brasília
export function findMoodOfDay(moodId: string | null, moodDay: string | null, today: string): Mood | undefined {
  return moodId !== null && moodDay === today ? findMood(moodId) : undefined;
}

// Saudação da Biblioteca: o Apelido inteiro ou, sem ele, o primeiro nome
export function buildGreetingName({ name, nickname }: { name: string; nickname: string | null }) {
  return nickname ?? buildFirstName(name);
}

// Maior quadrado no centro da imagem, para o recorte da Foto
export function buildCenteredSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), side };
}

// A Foto enviada, com a versão no endereço para a nova aparecer na hora; senão a do provedor; senão a inicial
export function buildPhotoUrl({ photoVersion, providerImage }: { photoVersion: number | null; providerImage: string | null }) {
  return photoVersion === null ? providerImage : `/perfil/foto?v=${photoVersion}`;
}
