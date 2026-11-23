import { describe, expect, it } from "vitest";
import { buildSortedTags, filterStoodsByTags, validateTagName } from "@/lib/tag/rules";

const EXAMS = { id: "prova", name: "Prova" };
const SCIENCES = { id: "exatas", name: "Exatas" };
const SEMESTER = { id: "semestre", name: "Semestre 1" };

const STOODS = [
  { id: "calculo", tags: [EXAMS, SCIENCES] },
  { id: "fisica", tags: [SCIENCES] },
  { id: "historia", tags: [] },
];

describe("validateTagName", () => {
  it("apara o nome nas pontas", () => {
    expect(validateTagName("  Semestre 1 ")).toEqual({ ok: true, name: "Semestre 1" });
  });

  it("aceita 30 caracteres e barra no nome", () => {
    expect(validateTagName(`2026/1 ${"a".repeat(23)}`)).toMatchObject({ ok: true });
  });

  it.each([
    ["vazio", "", "nome-da-tag-vazio"],
    ["só com espaços", "   ", "nome-da-tag-vazio"],
    ["acima de 30 caracteres", "a".repeat(31), "nome-da-tag-longo"],
  ])("recusa nome %s", (_case, name, reason) => {
    expect(validateTagName(name)).toEqual({ ok: false, reason });
  });
});

describe("buildSortedTags", () => {
  it("ordena sem diferenciar acento nem maiúsculas", () => {
    const sorted = buildSortedTags([{ name: "prova" }, { name: "Exatas" }, { name: "Álgebra" }]);

    expect(sorted.map((tag) => tag.name)).toEqual(["Álgebra", "Exatas", "prova"]);
  });
});

describe("filterStoodsByTags", () => {
  it("mostra todos os Stoods sem Tag ligada", () => {
    expect(filterStoodsByTags(STOODS, new Set())).toBe(STOODS);
  });

  it("mostra os Stoods que têm qualquer uma das Tags ligadas", () => {
    const filtered = filterStoodsByTags(STOODS, new Set([EXAMS.id, SCIENCES.id]));

    expect(filtered.map((stood) => stood.id)).toEqual(["calculo", "fisica"]);
  });

  it("devolve lista vazia quando nenhum Stood tem as Tags ligadas", () => {
    expect(filterStoodsByTags(STOODS, new Set([SEMESTER.id]))).toEqual([]);
  });
});
