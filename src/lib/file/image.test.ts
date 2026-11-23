import { describe, expect, it } from "vitest";
import { buildImageFileName, parseImageType } from "@/lib/file/image";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
const WEBP = [...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBP")];

describe("parseImageType", () => {
  it.each([
    ["PNG", PNG, "image/png"],
    ["JPEG", JPEG, "image/jpeg"],
    ["WebP", WEBP, "image/webp"],
  ])("reconhece %s pelos primeiros bytes", (_case, bytes, type) => {
    expect(parseImageType(Uint8Array.from(bytes))).toBe(type);
  });

  it.each([
    ["vazio", []],
    ["mais curto que o cabeçalho", PNG.slice(0, 4)],
    ["GIF", [...ascii("GIF89a"), 0x01, 0x00, 0x01, 0x00, 0x00, 0x00]],
    ["SVG", ascii('<svg xmlns="http://www.w3.org/2000/svg">')],
    ["HEIC", [0x00, 0x00, 0x00, 0x18, ...ascii("ftypheic")]],
    ["áudio WAV, que também começa com RIFF", [...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WAVE")]],
    ["PDF", ascii("%PDF-1.7\n%âãÏÓ")],
  ])("recusa %s", (_case, bytes) => {
    expect(parseImageType(Uint8Array.from(bytes))).toBeUndefined();
  });
});

describe("buildImageFileName", () => {
  it("tira a extensão do nome do arquivo enviado", () => {
    expect(buildImageFileName("Captura de tela 2026-11-16 às 10.32.15.png")).toBe("Captura de tela 2026-11-16 às 10.32.15");
  });

  it("mantém o nome sem extensão", () => {
    expect(buildImageFileName("Gráfico")).toBe("Gráfico");
  });

  it("devolve vazio quando o arquivo só tem extensão, para o Usuário dar o nome", () => {
    expect(buildImageFileName(".png")).toBe("");
  });

  it("ajusta o nome às regras de nome de Arquivo", () => {
    expect(buildImageFileName("Aula 1/2.jpg")).toBe("Aula 1-2");
  });
});

function ascii(text: string) {
  return [...text].map((char) => char.charCodeAt(0));
}
