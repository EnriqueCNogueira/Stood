import { describe, expect, it } from "vitest";
import {
  buildCenteredSquare,
  buildGreetingName,
  buildPhotoUrl,
  findMood,
  findMoodOfDay,
  MAX_BIO_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_PHOTO_BYTES,
  MOODS,
  validateBio,
  validateNickname,
  validatePhoto,
} from "@/lib/profile/rules";

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("validateNickname", () => {
  it("apara as pontas e aceita o limite de 30 caracteres", () => {
    expect(validateNickname("  Johny  ")).toEqual({ ok: true, nickname: "Johny" });
    expect(validateNickname("a".repeat(MAX_NICKNAME_LENGTH))).toMatchObject({ ok: true });
  });

  it("trata o vazio como sem Apelido", () => {
    expect(validateNickname("   ")).toEqual({ ok: true, nickname: null });
  });

  it.each([
    ["longo", "a".repeat(MAX_NICKNAME_LENGTH + 1), "apelido-longo"],
    ["com quebra de linha", "Jo\nhny", "apelido-com-controle"],
    ["com caractere nulo", "Jo\u0000hny", "apelido-com-controle"],
    ["com a quebra U+0085 na ponta", "\u0085Johny", "apelido-com-controle"],
  ])("recusa o Apelido %s", (_case, nickname, reason) => {
    expect(validateNickname(nickname)).toEqual({ ok: false, reason });
  });
});

describe("validateBio", () => {
  it("apara as pontas, aceita o limite e trata o vazio como sem Bio", () => {
    expect(validateBio(" Estudante de Computação ")).toEqual({ ok: true, bio: "Estudante de Computação" });
    expect(validateBio("a".repeat(MAX_BIO_LENGTH))).toMatchObject({ ok: true });
    expect(validateBio(" ")).toEqual({ ok: true, bio: null });
  });

  it.each([
    ["longa", "a".repeat(MAX_BIO_LENGTH + 1), "bio-longa"],
    ["com quebra de linha", "Estudante\nda Unifesp", "bio-com-controle"],
    ["com o separador de linha U+2028", "Estudante\u2028da Unifesp", "bio-com-controle"],
  ])("recusa a Bio %s", (_case, bio, reason) => {
    expect(validateBio(bio)).toEqual({ ok: false, reason });
  });
});

describe("findMood", () => {
  it("acha cada Humor da lista e nenhum fora dela", () => {
    expect(MOODS.map(({ id }) => findMood(id)?.label)).toEqual([
      "Motivação",
      "Concentração",
      "Animação",
      "Tranquilidade",
      "Dúvidas",
      "Cansaço",
      "Pressão",
      "Desânimo",
    ]);
    expect(["raiva", "constructor", ""].map(findMood)).toEqual([undefined, undefined, undefined]);
  });
});

describe("findMoodOfDay", () => {
  it("vale só no dia em que foi marcado", () => {
    expect(findMoodOfDay("tiredness", "2026-11-24", "2026-11-24")?.label).toBe("Cansaço");
    expect(findMoodOfDay("tiredness", "2026-11-24", "2026-11-25")).toBeUndefined();
    expect(findMoodOfDay(null, null, "2026-11-24")).toBeUndefined();
  });
});

describe("validatePhoto", () => {
  it("aceita um JPEG até o limite", () => {
    const bytes = new Uint8Array(MAX_PHOTO_BYTES);
    bytes.set(JPEG_HEADER);

    expect(validatePhoto(bytes)).toEqual({ ok: true });
  });

  it.each([
    ["vazia", new Uint8Array(0), "foto-vazia"],
    ["acima do limite", new Uint8Array([...JPEG_HEADER, ...new Array(MAX_PHOTO_BYTES).fill(0)]), "foto-grande"],
    ["em PNG", new Uint8Array(PNG_HEADER), "foto-invalida"],
    ["que é texto", new TextEncoder().encode("não sou uma foto"), "foto-invalida"],
  ])("recusa a Foto %s", (_case, bytes, reason) => {
    expect(validatePhoto(bytes)).toEqual({ ok: false, reason });
  });
});

describe("buildGreetingName", () => {
  it.each([
    ["o Apelido inteiro", { name: "João Victor Santos", nickname: "Johny da Silva" }, "Johny da Silva"],
    ["o primeiro nome, sem Apelido", { name: "João Victor Santos", nickname: null }, "João"],
  ])("usa %s", (_case, user, expected) => {
    expect(buildGreetingName(user)).toBe(expected);
  });
});

describe("buildCenteredSquare", () => {
  it.each([
    ["deitada", 1000, 400, { x: 300, y: 0, side: 400 }],
    ["em pé", 400, 1000, { x: 0, y: 300, side: 400 }],
    ["de sobra ímpar", 401, 400, { x: 0, y: 0, side: 400 }],
    ["quadrada", 400, 400, { x: 0, y: 0, side: 400 }],
  ])("recorta o centro da imagem %s", (_case, width, height, expected) => {
    expect(buildCenteredSquare(width, height)).toEqual(expected);
  });
});

describe("buildPhotoUrl", () => {
  it("usa a Foto enviada, senão a do provedor, senão nenhuma", () => {
    expect(buildPhotoUrl({ photoVersion: 7, providerImage: "https://exemplo.com/foto.png" })).toBe("/perfil/foto?v=7");
    expect(buildPhotoUrl({ photoVersion: null, providerImage: "https://exemplo.com/foto.png" })).toBe("https://exemplo.com/foto.png");
    expect(buildPhotoUrl({ photoVersion: null, providerImage: null })).toBeNull();
  });
});
