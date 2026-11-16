import { describe, expect, it } from "vitest";
import { buildVideoFileName, parseYouTubeVideoId } from "@/lib/video/link";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("parseYouTubeVideoId", () => {
  it.each([
    ["watch", `https://www.youtube.com/watch?v=${VIDEO_ID}`],
    ["watch com tempo e playlist", `https://www.youtube.com/watch?v=${VIDEO_ID}&t=42s&list=PL123`],
    ["watch sem www", `https://youtube.com/watch?v=${VIDEO_ID}`],
    ["watch no celular", `https://m.youtube.com/watch?v=${VIDEO_ID}`],
    ["YouTube Music", `https://music.youtube.com/watch?v=${VIDEO_ID}`],
    ["link curto com si", `https://youtu.be/${VIDEO_ID}?si=abc123`],
    ["Shorts", `https://www.youtube.com/shorts/${VIDEO_ID}`],
    ["embed", `https://www.youtube.com/embed/${VIDEO_ID}`],
    ["embed sem cookies", `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`],
    ["live", `https://www.youtube.com/live/${VIDEO_ID}`],
    ["sem protocolo", `youtube.com/watch?v=${VIDEO_ID}`],
    ["com espaço nas pontas", `  https://youtu.be/${VIDEO_ID}  `],
  ])("lê o id do link %s", (_case, url) => {
    expect(parseYouTubeVideoId(url)).toBe(VIDEO_ID);
  });

  it.each([
    ["vazio", ""],
    ["só o id", VIDEO_ID],
    ["de outro site", `https://vimeo.com/watch?v=${VIDEO_ID}`],
    ["de domínio que imita o YouTube", `https://youtube.com.exemplo.com/watch?v=${VIDEO_ID}`],
    ["de domínio que termina em youtube.com", `https://notyoutube.com/watch?v=${VIDEO_ID}`],
    ["com outro protocolo", `javascript://youtube.com/watch?v=${VIDEO_ID}`],
    ["sem v", "https://www.youtube.com/watch?list=PL123"],
    ["com id curto", "https://www.youtube.com/watch?v=abc"],
    ["com id de caractere inválido", "https://youtu.be/dQw4w9WgXc!"],
    ["de canal", "https://www.youtube.com/@RickAstleyYT"],
    ["de playlist", "https://www.youtube.com/playlist?list=PL123"],
    ["que não é link", "Never Gonna Give You Up"],
  ])("recusa link %s", (_case, url) => {
    expect(parseYouTubeVideoId(url)).toBeUndefined();
  });
});

describe("buildVideoFileName", () => {
  it("mantém o título que já cabe no nome", () => {
    expect(buildVideoFileName("Limites e derivadas")).toBe("Limites e derivadas");
  });

  it("corta o título longo em 50 caracteres com reticências", () => {
    const name = buildVideoFileName("Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)");

    expect(name).toBe("Rick Astley - Never Gonna Give You Up (Official V…");
  });

  it("tira o espaço que sobra antes das reticências", () => {
    expect(buildVideoFileName(`${"a".repeat(48)} bcd`)).toBe(`${"a".repeat(48)}…`);
  });

  it("não parte um emoji ao cortar", () => {
    const name = buildVideoFileName(`${"a".repeat(48)}🎓🎓`);

    expect(name).toBe(`${"a".repeat(48)}…`);
  });

  it("troca / e \\ por hífen", () => {
    expect(buildVideoFileName("Aula 1/2 \\ Limites")).toBe("Aula 1-2 - Limites");
  });

  it("junta espaços repetidos e apara as pontas", () => {
    expect(buildVideoFileName("  Aula   de \n Limites  ")).toBe("Aula de Limites");
  });
});
