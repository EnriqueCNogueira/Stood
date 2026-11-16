// Regras da Imagem sem I/O: o modal do client confere antes de enviar e o Service confere de novo
// Caminho relativo com extensão, porque o seed de dev roda src/db/schema.ts direto no Node
import { buildSuggestedName } from "../stood/details.ts";

// Fonte única dos formatos e do teto: src/db/schema.ts monta os CHECKs de file_blobs com estas constantes
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Valor do accept do campo de arquivo
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
// O formato mais longo de reconhecer é o WebP: RIFF, 4 bytes de tamanho e WEBP
export const IMAGE_HEADER_BYTES = 12;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const WEBP_TAG_OFFSET = 8;
const EXTENSION = /\.[^.]*$/;

// O formato vem dos primeiros bytes, e não da extensão nem do tipo que o navegador informa, que o Usuário controla
export function parseImageType(bytes: Uint8Array): ImageType | undefined {
  if (hasBytesAt(bytes, PNG_SIGNATURE, 0)) return "image/png";
  if (hasBytesAt(bytes, JPEG_SIGNATURE, 0)) return "image/jpeg";
  if (hasBytesAt(bytes, RIFF, 0) && hasBytesAt(bytes, WEBP, WEBP_TAG_OFFSET)) return "image/webp";
  return undefined;
}

// Rota do route handler que serve os bytes, em src/app/(protected)/imagens/[id]/route.ts
export function buildImageUrl(fileId: string) {
  return `/imagens/${fileId}`;
}

export function buildImageFileName(fileName: string) {
  return buildSuggestedName(fileName.replace(EXTENSION, ""));
}

function hasBytesAt(bytes: Uint8Array, expected: number[], offset: number) {
  return expected.every((byte, index) => bytes[offset + index] === byte);
}
