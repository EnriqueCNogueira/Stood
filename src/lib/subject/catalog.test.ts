import { describe, expect, it } from "vitest";
import { buildSubjectTree, findSubject, SUBJECTS } from "@/lib/subject/catalog";
import { validateName, validateStoodDetails } from "@/lib/stood/details";
import { isYouTubeVideoId } from "@/lib/video/link";

const MIN_VIDEOS = 10;
const MAX_VIDEOS = 15;

// O catálogo é copiado direto para o banco: um nome fora das regras quebraria a cópia no CHECK
describe("SUBJECTS", () => {
  it.each(SUBJECTS.map((subject) => [subject.name, subject]))("%s tem nome e descrição de Stood válidos", (_name, subject) => {
    expect(validateStoodDetails({ name: subject.name, description: subject.description })).toMatchObject({ ok: true });
  });

  it.each(SUBJECTS.map((subject) => [subject.name, subject]))(`%s tem de ${MIN_VIDEOS} a ${MAX_VIDEOS} Vídeos`, (_name, subject) => {
    expect(subject.videos.length).toBeGreaterThanOrEqual(MIN_VIDEOS);
    expect(subject.videos.length).toBeLessThanOrEqual(MAX_VIDEOS);
  });

  it.each(SUBJECTS.map((subject) => [subject.name, subject]))("%s só tem ids de Vídeo válidos e sem repetir", (_name, subject) => {
    const videoIds = subject.videos.map((video) => video.videoId);

    expect(videoIds.filter((videoId) => !isYouTubeVideoId(videoId))).toEqual([]);
    expect(new Set(videoIds).size).toBe(videoIds.length);
  });

  it("não repete o slug entre Matérias", () => {
    const slugs = SUBJECTS.map((subject) => subject.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("buildSubjectTree", () => {
  it("numera os Vídeos na ordem da ementa", () => {
    const subject = SUBJECTS[0];

    const tree = buildSubjectTree(subject);

    expect(tree.slice(0, 2)).toEqual([
      { kind: "file", id: subject.videos[0].videoId, name: `Vídeo 1: ${subject.videos[0].topic}`, type: "video", videoId: subject.videos[0].videoId },
      { kind: "file", id: subject.videos[1].videoId, name: `Vídeo 2: ${subject.videos[1].topic}`, type: "video", videoId: subject.videos[1].videoId },
    ]);
  });

  it.each(SUBJECTS.map((subject) => [subject.name, subject]))("%s gera nomes de Arquivo válidos", (_name, subject) => {
    const invalid = buildSubjectTree(subject).filter((file) => !validateName(file.name).ok);

    expect(invalid).toEqual([]);
  });
});

describe("findSubject", () => {
  it("acha a Matéria pelo slug", () => {
    expect(findSubject(SUBJECTS[0].slug)).toBe(SUBJECTS[0]);
  });

  it.each(["", "calculo-99", "__proto__"])("não acha o slug %j", (slug) => {
    expect(findSubject(slug)).toBeUndefined();
  });
});
