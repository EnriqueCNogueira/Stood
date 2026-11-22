import { describe, expect, it } from "vitest";
import {
  type DrawingElement,
  type DrawingHistory,
  MAX_DRAWING_ELEMENTS,
  MAX_HISTORY_STEPS,
  buildDrawingContent,
  buildDrawingHistory,
  buildMovedElement,
  buildShapeElement,
  findElementAt,
  parseDrawingScene,
} from "@/lib/drawing/scene";

const STYLE = { color: "ink", strokeWidth: 2 } as const;
const LINE: DrawingElement = { kind: "line", id: "line", start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, ...STYLE };
const RECTANGLE: DrawingElement = { kind: "rectangle", id: "rectangle", x: 0, y: 0, width: 100, height: 50, ...STYLE };
const ELLIPSE: DrawingElement = { kind: "ellipse", id: "ellipse", x: 0, y: 0, width: 100, height: 50, ...STYLE };
const PEN: DrawingElement = { kind: "pen", id: "pen", points: [[0, 0], [50, 0], [50, 50]], ...STYLE };
const TEXT: DrawingElement = { kind: "text", id: "text", x: 10, y: 10, text: "Limite", color: "blue", fontSize: 20 };

describe("parseDrawingScene", () => {
  it("lê a cena salva com todos os tipos de elemento", () => {
    const scene = { version: 1, elements: [LINE, RECTANGLE, ELLIPSE, PEN, TEXT, { ...LINE, kind: "arrow", id: "arrow" }] };

    expect(parseDrawingScene(JSON.stringify(scene))).toEqual(scene);
  });

  it("lê de volta o que buildDrawingContent grava", () => {
    const scene = { version: 1 as const, elements: [PEN, TEXT] };

    expect(parseDrawingScene(buildDrawingContent(scene))).toEqual(scene);
  });

  it.each([
    ["vazia", ""],
    ["que não é JSON", "{"],
    ["do Excalidraw", JSON.stringify({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} })],
    ["com cor fora da paleta", JSON.stringify({ version: 1, elements: [{ ...LINE, color: "#ff0000" }] })],
    ["com espessura fora da lista", JSON.stringify({ version: 1, elements: [{ ...LINE, strokeWidth: 50 }] })],
    ["com tipo desconhecido", JSON.stringify({ version: 1, elements: [{ ...LINE, kind: "star" }] })],
    ["com coordenada gigante", JSON.stringify({ version: 1, elements: [{ ...RECTANGLE, x: 1e9 }] })],
    ["com texto vazio", JSON.stringify({ version: 1, elements: [{ ...TEXT, text: "" }] })],
    ["com o mesmo id duas vezes", JSON.stringify({ version: 1, elements: [LINE, LINE] })],
    [
      "com elementos demais",
      JSON.stringify({
        version: 1,
        elements: Array.from({ length: MAX_DRAWING_ELEMENTS + 1 }, (_, index) => ({ ...LINE, id: `line-${index}` })),
      }),
    ],
  ])("recusa cena %s", (_case, content) => {
    expect(parseDrawingScene(content)).toBeUndefined();
  });
});

describe("findElementAt", () => {
  it.each([
    ["linha, perto do traço", LINE, { x: 50, y: 3 }],
    ["retângulo, na borda", RECTANGLE, { x: 100, y: 25 }],
    ["elipse, na borda", ELLIPSE, { x: 50, y: 2 }],
    ["lápis, perto do segundo trecho", PEN, { x: 52, y: 30 }],
    ["texto, dentro do retângulo das letras", TEXT, { x: 20, y: 20 }],
  ])("acha %s", (_case, element, point) => {
    expect(findElementAt([element], point)).toBe(element.id);
  });

  it.each([
    ["linha, longe do traço", LINE, { x: 50, y: 30 }],
    ["retângulo, no meio, que não tem preenchimento", RECTANGLE, { x: 50, y: 25 }],
    ["elipse, no centro", ELLIPSE, { x: 50, y: 25 }],
    ["linha, depois da ponta", LINE, { x: 130, y: 0 }],
  ])("não acha %s", (_case, element, point) => {
    expect(findElementAt([element], point)).toBeUndefined();
  });

  it("devolve o elemento de cima quando dois se sobrepõem", () => {
    const above = { ...LINE, id: "de-cima" };

    expect(findElementAt([LINE, above], { x: 50, y: 0 })).toBe("de-cima");
  });
});

describe("buildMovedElement", () => {
  it.each([
    ["lápis", PEN, { points: [[10, 20], [60, 20], [60, 70]] }],
    ["linha", LINE, { start: { x: 10, y: 20 }, end: { x: 110, y: 20 } }],
    ["retângulo", RECTANGLE, { x: 10, y: 20 }],
    ["texto", TEXT, { x: 20, y: 30 }],
  ])("desloca %s", (_case, element, moved) => {
    expect(buildMovedElement(element, { x: 10, y: 20 })).toMatchObject(moved);
  });
});

describe("buildShapeElement", () => {
  it("normaliza o retângulo desenhado de baixo para cima", () => {
    const shape = buildShapeElement("rectangle", "r", { x: 100, y: 80 }, { x: 40, y: 20 }, STYLE);

    expect(shape).toEqual({ kind: "rectangle", id: "r", x: 40, y: 20, width: 60, height: 60, ...STYLE });
  });

  it("mantém a direção da seta, que aponta para onde o arrasto terminou", () => {
    const shape = buildShapeElement("arrow", "a", { x: 100, y: 80 }, { x: 40, y: 20 }, STYLE);

    expect(shape).toEqual({ kind: "arrow", id: "a", start: { x: 100, y: 80 }, end: { x: 40, y: 20 }, ...STYLE });
  });
});

describe("buildDrawingHistory", () => {
  const EMPTY: DrawingHistory = { elements: [], past: [], future: [] };

  it("adiciona o elemento por cima dos outros", () => {
    const history = apply(apply(EMPTY, { type: "add", element: LINE }), { type: "add", element: TEXT });

    expect(history.elements.map((element) => element.id)).toEqual(["line", "text"]);
  });

  it("desfaz e refaz o último passo", () => {
    const drawn = apply(apply(EMPTY, { type: "add", element: LINE }), { type: "add", element: TEXT });

    const undone = apply(drawn, { type: "undo" });
    const redone = apply(undone, { type: "redo" });

    expect([undone.elements, redone.elements]).toEqual([[LINE], [LINE, TEXT]]);
  });

  it("descarta o que dava para refazer quando o Usuário desenha de novo", () => {
    const undone = apply(apply(EMPTY, { type: "add", element: LINE }), { type: "undo" });

    expect(apply(undone, { type: "add", element: TEXT }).future).toEqual([]);
  });

  it("move só os elementos pedidos", () => {
    const drawn = apply(apply(EMPTY, { type: "add", element: LINE }), { type: "add", element: RECTANGLE });

    const moved = apply(drawn, { type: "move", ids: ["rectangle"], delta: { x: 5, y: 5 } });

    expect(moved.elements).toEqual([LINE, { ...RECTANGLE, x: 5, y: 5 }]);
  });

  it("troca o elemento editado, como o texto reescrito", () => {
    const drawn = apply(EMPTY, { type: "add", element: TEXT });

    expect(apply(drawn, { type: "replace", element: { ...TEXT, text: "Derivada" } }).elements).toEqual([
      { ...TEXT, text: "Derivada" },
    ]);
  });

  it("apaga os elementos pedidos", () => {
    const drawn = apply(apply(EMPTY, { type: "add", element: LINE }), { type: "add", element: TEXT });

    expect(apply(drawn, { type: "delete", ids: ["line"] }).elements).toEqual([TEXT]);
  });

  it.each([
    ["desfazer sem passos", { type: "undo" }],
    ["refazer sem passos", { type: "redo" }],
    ["apagar id que não existe", { type: "delete", ids: ["nenhum"] }],
    ["mover sem deslocamento", { type: "move", ids: ["line"], delta: { x: 0, y: 0 } }],
    ["adicionar de novo um elemento que já está na cena", { type: "add", element: LINE }],
  ] as const)("não cria passo ao %s", (_case, action) => {
    const opened: DrawingHistory = { elements: [LINE], past: [], future: [] };

    expect(buildDrawingHistory(opened, action)).toBe(opened);
  });

  it(`guarda no máximo ${MAX_HISTORY_STEPS} passos para desfazer`, () => {
    let history = EMPTY;
    for (let index = 0; index < MAX_HISTORY_STEPS + 5; index++) {
      history = apply(history, { type: "add", element: { ...LINE, id: `line-${index}` } });
    }

    expect(history.past).toHaveLength(MAX_HISTORY_STEPS);
  });

  function apply(history: DrawingHistory, action: Parameters<typeof buildDrawingHistory>[1]) {
    return buildDrawingHistory(history, action);
  }
});
