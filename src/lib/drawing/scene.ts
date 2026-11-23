import { z } from "zod";

// Cena do Desenho sem I/O: o editor do client desenha e edita, e o Service confere antes de gravar

export type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };

// A cena guarda o nome da cor, e não o valor: o editor troca pelo token, que acompanha o tema do Quadro
export const DRAWING_COLORS = ["ink", "red", "blue", "green", "purple", "orange"] as const;
export type DrawingColor = (typeof DRAWING_COLORS)[number];
export const STROKE_WIDTHS = [2, 4, 8] as const;
export type StrokeWidth = (typeof STROKE_WIDTHS)[number];
export const TEXT_FONT_SIZE = 20;

export const MAX_DRAWING_ELEMENTS = 2_000;
export const MAX_HISTORY_STEPS = 100;
// Teto do JSON gravado: cabe no limite de corpo das Server Actions
export const MAX_DRAWING_LENGTH = 2_000_000;
const MAX_PEN_POINTS = 5_000;
const MAX_TEXT_LENGTH = 2_000;
const MAX_COORDINATE = 100_000;
// Distância, em pixels, em que o clique ainda acerta o traço
const HIT_TOLERANCE = 6;
// Medida aproximada das letras, sem ler o layout: largura média e altura da linha em relação ao tamanho da fonte
const CHARACTER_WIDTH_RATIO = 0.6;
export const LINE_HEIGHT_RATIO = 1.25;
const ARROW_HEAD_ANGLE = Math.PI / 7;
const ARROW_HEAD_BASE_SIZE = 10;

type Style = { color: DrawingColor; strokeWidth: StrokeWidth };
export type ShapeKind = "line" | "arrow" | "rectangle" | "ellipse";

export type DrawingElement =
  | ({ kind: "pen"; id: string; points: [number, number][] } & Style)
  | ({ kind: "line" | "arrow"; id: string; start: Point; end: Point } & Style)
  | ({ kind: "rectangle" | "ellipse"; id: string } & Rect & Style)
  | { kind: "text"; id: string; x: number; y: number; text: string; color: DrawingColor; fontSize: number };

export type DrawingScene = { version: 1; elements: DrawingElement[] };

// Cada passo guarda a lista inteira: os elementos são imutáveis, então os passos dividem os mesmos objetos
export type DrawingHistory = { elements: DrawingElement[]; past: DrawingElement[][]; future: DrawingElement[][] };

export type DrawingAction =
  | { type: "add"; element: DrawingElement }
  | { type: "replace"; element: DrawingElement }
  | { type: "move"; ids: readonly string[]; delta: Point }
  | { type: "delete"; ids: readonly string[] }
  | { type: "undo" }
  | { type: "redo" };

export const EMPTY_DRAWING_CONTENT = buildDrawingContent({ version: 1, elements: [] });

const coordinateSchema = z.number().min(-MAX_COORDINATE).max(MAX_COORDINATE);
const sizeSchema = z.number().min(0).max(MAX_COORDINATE);
const pointSchema = z.object({ x: coordinateSchema, y: coordinateSchema });
const idSchema = z.string().min(1).max(64);
const styleSchema = {
  color: z.enum(DRAWING_COLORS),
  strokeWidth: z.union(STROKE_WIDTHS.map((width) => z.literal(width))),
};

const elementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pen"),
    id: idSchema,
    points: z.array(z.tuple([coordinateSchema, coordinateSchema])).min(1).max(MAX_PEN_POINTS),
    ...styleSchema,
  }),
  z.object({ kind: z.enum(["line", "arrow"]), id: idSchema, start: pointSchema, end: pointSchema, ...styleSchema }),
  z.object({
    kind: z.enum(["rectangle", "ellipse"]),
    id: idSchema,
    x: coordinateSchema,
    y: coordinateSchema,
    width: sizeSchema,
    height: sizeSchema,
    ...styleSchema,
  }),
  z.object({
    kind: z.literal("text"),
    id: idSchema,
    x: coordinateSchema,
    y: coordinateSchema,
    text: z.string().min(1).max(MAX_TEXT_LENGTH),
    color: z.enum(DRAWING_COLORS),
    fontSize: z.literal(TEXT_FONT_SIZE),
  }),
]);

const sceneSchema = z.object({
  version: z.literal(1),
  elements: z
    .array(elementSchema)
    .max(MAX_DRAWING_ELEMENTS)
    .refine((elements) => new Set(elements.map((element) => element.id)).size === elements.length),
});

// Conteúdo salvo fora do formato devolve undefined: o editor abre vazio e o Service recusa gravar
export function parseDrawingScene(content: string): DrawingScene | undefined {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return undefined;
  }
  const parsed = sceneSchema.safeParse(json);
  return parsed.success ? (parsed.data as DrawingScene) : undefined;
}

export function buildDrawingContent(scene: DrawingScene) {
  return JSON.stringify(scene);
}

// O elemento de cima vem por último na lista; retângulo e elipse não têm preenchimento, então só a borda acerta
export function findElementAt(elements: DrawingElement[], point: Point): string | undefined {
  for (let index = elements.length - 1; index >= 0; index--) {
    if (isElementAt(elements[index], point)) return elements[index].id;
  }
  return undefined;
}

export function buildMovedElement(element: DrawingElement, delta: Point): DrawingElement {
  switch (element.kind) {
    case "pen":
      return { ...element, points: element.points.map(([x, y]) => [x + delta.x, y + delta.y]) };
    case "line":
    case "arrow":
      return { ...element, start: buildShiftedPoint(element.start, delta), end: buildShiftedPoint(element.end, delta) };
    default:
      return { ...element, x: element.x + delta.x, y: element.y + delta.y };
  }
}

// Forma do arrasto de start a end: retângulo e elipse sempre com largura e altura positivas
export function buildShapeElement(kind: ShapeKind, id: string, start: Point, end: Point, style: Style): DrawingElement {
  if (kind === "line" || kind === "arrow") return { kind, id, start, end, ...style };
  return {
    kind,
    id,
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    ...style,
  };
}

// Caminho SVG do traço do lápis; um ponto só vira um traço mínimo, para o clique do lápis deixar uma marca
export function buildPenPath(points: [number, number][]) {
  const [[firstX, firstY], ...rest] = points;
  if (rest.length === 0) return `M ${firstX} ${firstY} l 0.01 0`;
  return `M ${firstX} ${firstY} ${rest.map(([x, y]) => `L ${x} ${y}`).join(" ")}`;
}

// As duas abas da ponta da seta, com tamanho que acompanha a espessura
export function buildArrowHead(start: Point, end: Point, strokeWidth: number): { left: Point; right: Point } {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = ARROW_HEAD_BASE_SIZE + strokeWidth * 2;
  return {
    left: { x: end.x - size * Math.cos(angle - ARROW_HEAD_ANGLE), y: end.y - size * Math.sin(angle - ARROW_HEAD_ANGLE) },
    right: { x: end.x - size * Math.cos(angle + ARROW_HEAD_ANGLE), y: end.y - size * Math.sin(angle + ARROW_HEAD_ANGLE) },
  };
}

// Caixa em volta do elemento, para o contorno de seleção
export function buildElementBounds(element: DrawingElement): Rect {
  switch (element.kind) {
    case "pen":
      return buildPointsBounds(element.points.map(([x, y]) => ({ x, y })));
    case "line":
    case "arrow":
      return buildPointsBounds([element.start, element.end]);
    case "text":
      return buildTextBounds(element);
    default:
      return { x: element.x, y: element.y, width: element.width, height: element.height };
  }
}

// Desfazer volta a lista anterior; um passo novo limpa o que dava para refazer. Sem mudança, devolve o mesmo objeto.
export function buildDrawingHistory(history: DrawingHistory, action: DrawingAction): DrawingHistory {
  switch (action.type) {
    case "undo": {
      const previous = history.past.at(-1);
      if (!previous) return history;
      return { elements: previous, past: history.past.slice(0, -1), future: [history.elements, ...history.future] };
    }
    case "redo": {
      const [next, ...future] = history.future;
      if (!next) return history;
      return { elements: next, past: [...history.past, history.elements], future };
    }
    case "add": {
      // O mesmo gesto confirmado duas vezes não duplica o id, que a cena salva recusa
      const isAlreadyAdded = history.elements.some((element) => element.id === action.element.id);
      return isAlreadyAdded ? history : buildStep(history, [...history.elements, action.element]);
    }
    case "replace":
      return buildStep(
        history,
        history.elements.map((element) => (element.id === action.element.id ? action.element : element)),
      );
    case "move": {
      if (action.delta.x === 0 && action.delta.y === 0) return history;
      const ids = new Set(action.ids);
      return buildStep(
        history,
        history.elements.map((element) => (ids.has(element.id) ? buildMovedElement(element, action.delta) : element)),
      );
    }
    case "delete": {
      const ids = new Set(action.ids);
      const remaining = history.elements.filter((element) => !ids.has(element.id));
      return remaining.length === history.elements.length ? history : buildStep(history, remaining);
    }
  }
}

function buildStep(history: DrawingHistory, elements: DrawingElement[]): DrawingHistory {
  return { elements, past: [...history.past, history.elements].slice(-MAX_HISTORY_STEPS), future: [] };
}

function isElementAt(element: DrawingElement, point: Point) {
  const tolerance = HIT_TOLERANCE + ("strokeWidth" in element ? element.strokeWidth / 2 : 0);
  switch (element.kind) {
    case "pen":
      return isNearPolyline(element.points.map(([x, y]) => ({ x, y })), point, tolerance);
    case "line":
    case "arrow":
      return buildSegmentDistance(point, element.start, element.end) <= tolerance;
    case "rectangle":
      return isNearRectangleBorder(element, point, tolerance);
    case "ellipse":
      return isNearEllipseBorder(element, point, tolerance);
    case "text":
      return isInsideRect(buildTextBounds(element), point);
  }
}

function isNearPolyline(points: Point[], point: Point, tolerance: number) {
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= tolerance;
  return points.slice(1).some((end, index) => buildSegmentDistance(point, points[index], end) <= tolerance);
}

function isNearRectangleBorder(rect: Rect, point: Point, tolerance: number) {
  const outer = { x: rect.x - tolerance, y: rect.y - tolerance, width: rect.width + 2 * tolerance, height: rect.height + 2 * tolerance };
  const inner = { x: rect.x + tolerance, y: rect.y + tolerance, width: rect.width - 2 * tolerance, height: rect.height - 2 * tolerance };
  const isInsideInner = inner.width > 0 && inner.height > 0 && isInsideRect(inner, point);
  return isInsideRect(outer, point) && !isInsideInner;
}

// Distância aproximada até a borda: quanto o raio normalizado foge de 1, na escala do menor raio
function isNearEllipseBorder(rect: Rect, point: Point, tolerance: number) {
  const radiusX = rect.width / 2;
  const radiusY = rect.height / 2;
  if (radiusX === 0 || radiusY === 0) return isNearRectangleBorder(rect, point, tolerance);
  const normalized = Math.hypot((point.x - rect.x - radiusX) / radiusX, (point.y - rect.y - radiusY) / radiusY);
  return Math.abs(normalized - 1) * Math.min(radiusX, radiusY) <= tolerance;
}

function buildSegmentDistance(point: Point, start: Point, end: Point) {
  const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / lengthSquared;
  const clamped = Math.min(Math.max(projection, 0), 1);
  return Math.hypot(point.x - (start.x + clamped * (end.x - start.x)), point.y - (start.y + clamped * (end.y - start.y)));
}

function buildTextBounds(element: Extract<DrawingElement, { kind: "text" }>): Rect {
  const lines = element.text.split("\n");
  const longest = Math.max(...lines.map((line) => line.length));
  return {
    x: element.x,
    y: element.y,
    width: longest * element.fontSize * CHARACTER_WIDTH_RATIO,
    height: lines.length * element.fontSize * LINE_HEIGHT_RATIO,
  };
}

function buildPointsBounds(points: Point[]): Rect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function buildShiftedPoint(point: Point, delta: Point): Point {
  return { x: point.x + delta.x, y: point.y + delta.y };
}

function isInsideRect(rect: Rect, point: Point) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
