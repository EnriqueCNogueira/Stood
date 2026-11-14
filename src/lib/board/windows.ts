import type { FileType } from "@/lib/stood/tree";

// Estado das Janelas do Quadro, sem React: recebe o estado e uma ação e devolve o próximo estado ou a recusa

export const MAX_WINDOWS = 10;
export const MAX_VIDEO_WINDOWS = 2;
export const MIN_WINDOW_WIDTH = 220;
export const MIN_WINDOW_HEIGHT = 140;
const CASCADE_STEP = 24;

export const DEFAULT_WINDOW_SIZES: Record<FileType, Size> = {
  video: { width: 460, height: 300 },
  note: { width: 380, height: 380 },
  drawing: { width: 440, height: 300 },
  image: { width: 320, height: 240 },
  pdf: { width: 340, height: 380 },
};

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;
export type BoardFile = { id: string; type: FileType; name: string };

// restoreRect guarda posição e tamanho enquanto a Janela está maximizada; z é a ordem de empilhamento, maior na frente
export type BoardWindow = { file: BoardFile; rect: Rect; restoreRect: Rect | null; z: number };

// A ordem do array é a de abertura: a tela não reordena as Janelas ao trazer uma para a frente
export type BoardState = { windows: BoardWindow[] };

// snap é o espaçamento da grade quando o encaixe vale, ou nulo
export type BoardContext = { area: Size; snap: number | null };

export type BoardAction =
  | { type: "open"; file: BoardFile; position?: Point }
  | { type: "focus"; fileId: string }
  | { type: "move"; fileId: string; position: Point }
  | { type: "resize"; fileId: string; size: Size }
  | { type: "toggle-maximize"; fileId: string }
  | { type: "close"; fileId: string }
  | { type: "close-all" }
  | { type: "fit-area" };

type BuildBoardStateResult = { ok: true; state: BoardState } | { ok: false; reason: "limite-de-janelas" | "limite-de-videos" };

// Devolve o mesmo objeto de estado quando nada muda, para a tela não redesenhar à toa
export function buildBoardState(state: BoardState, action: BoardAction, context: BoardContext): BuildBoardStateResult {
  switch (action.type) {
    case "open":
      return buildOpenedState(state, action.file, action.position, context);
    case "focus":
      return { ok: true, state: buildFrontState(state, action.fileId) };
    case "move":
      return buildRestoredWindowState(state, action.fileId, (rect) =>
        buildPlacedRect({ ...rect, ...action.position }, context),
      );
    case "resize":
      return buildRestoredWindowState(state, action.fileId, (rect) => buildResizedRect(rect, action.size, context));
    case "toggle-maximize":
      return { ok: true, state: buildUpdatedState(state, action.fileId, (window) => buildToggledWindow(window, context)) };
    case "close":
      return { ok: true, state: { windows: state.windows.filter((window) => window.file.id !== action.fileId) } };
    case "close-all":
      return { ok: true, state: { windows: [] } };
    case "fit-area":
      return { ok: true, state: buildFittedState(state, context) };
  }
}

// Posição e tamanho finais de uma Janela: encaixados na grade quando vale e presos à área
export function buildPlacedRect(rect: Rect, context: BoardContext): Rect {
  const { area, snap } = context;
  const width = buildClampedSize(rect.width, MIN_WINDOW_WIDTH, area.width, snap);
  const height = buildClampedSize(rect.height, MIN_WINDOW_HEIGHT, area.height, snap);
  return {
    x: buildClampedPosition(rect.x, area.width - width, snap),
    y: buildClampedPosition(rect.y, area.height - height, snap),
    width,
    height,
  };
}

// Retângulo da Janela que um Arquivo abriria nesta posição, usado também no contorno do arrastar
export function buildOpenRect(type: FileType, position: Point, context: BoardContext): Rect {
  return buildPlacedRect({ ...position, ...DEFAULT_WINDOW_SIZES[type] }, context);
}

export function findFrontWindow(state: BoardState): BoardWindow | undefined {
  return state.windows.reduce<BoardWindow | undefined>((front, window) => (!front || window.z > front.z ? window : front), undefined);
}

// Contagem do contador da barra e dos limites de abrir: a regra mora num lugar só
export function buildWindowCounts(state: BoardState) {
  const videos = state.windows.filter((window) => window.file.type === "video").length;
  return {
    windows: state.windows.length,
    videos,
    isWindowsFull: state.windows.length >= MAX_WINDOWS,
    isVideosFull: videos >= MAX_VIDEO_WINDOWS,
  };
}

export type WindowCounts = ReturnType<typeof buildWindowCounts>;

export function isMaximized(window: BoardWindow) {
  return window.restoreRect !== null;
}

export function isSameRect(a: Rect | null, b: Rect | null) {
  return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);
}

function buildOpenedState(
  state: BoardState,
  file: BoardFile,
  position: Point | undefined,
  context: BoardContext,
): BuildBoardStateResult {
  if (state.windows.some((window) => window.file.id === file.id)) {
    return { ok: true, state: buildFrontState(state, file.id) };
  }
  const counts = buildWindowCounts(state);
  if (counts.isWindowsFull) return { ok: false, reason: "limite-de-janelas" };
  if (file.type === "video" && counts.isVideosFull) return { ok: false, reason: "limite-de-videos" };

  const cascadeOffset = (state.windows.length + 1) * CASCADE_STEP;
  const rect = buildOpenRect(file.type, position ?? { x: cascadeOffset, y: cascadeOffset }, context);
  const window = { file, rect, restoreRect: null, z: buildNextZ(state) };
  return { ok: true, state: { windows: [...state.windows, window] } };
}

// O canto de cima e da esquerda fica parado: o tamanho só cresce até a borda da área
function buildResizedRect(rect: Rect, size: Size, context: BoardContext): Rect {
  const { area, snap } = context;
  return {
    ...rect,
    width: buildClampedSize(size.width, MIN_WINDOW_WIDTH, area.width - rect.x, snap),
    height: buildClampedSize(size.height, MIN_WINDOW_HEIGHT, area.height - rect.y, snap),
  };
}

function buildToggledWindow(window: BoardWindow, context: BoardContext): BoardWindow {
  if (window.restoreRect) {
    return { ...window, rect: buildPlacedRect(window.restoreRect, context), restoreRect: null };
  }
  return { ...window, rect: { x: 0, y: 0, ...context.area }, restoreRect: window.rect };
}

function buildFittedState(state: BoardState, context: BoardContext): BoardState {
  const windows = state.windows.map((window) => {
    const rect = window.restoreRect ? { x: 0, y: 0, ...context.area } : buildPlacedRect(window.rect, { ...context, snap: null });
    return isSameRect(rect, window.rect) ? window : { ...window, rect };
  });
  return windows.every((window, index) => window === state.windows[index]) ? state : { windows };
}

// Janela maximizada não se move nem muda de tamanho até ser restaurada
function buildRestoredWindowState(
  state: BoardState,
  fileId: string,
  buildRect: (rect: Rect) => Rect,
): BuildBoardStateResult {
  const next = buildUpdatedState(state, fileId, (window) => {
    if (isMaximized(window)) return window;
    const rect = buildRect(window.rect);
    return isSameRect(rect, window.rect) ? window : { ...window, rect };
  });
  return { ok: true, state: buildFrontState(next, fileId) };
}

function buildUpdatedState(state: BoardState, fileId: string, update: (window: BoardWindow) => BoardWindow): BoardState {
  let changed = false;
  const windows = state.windows.map((window) => {
    if (window.file.id !== fileId) return window;
    const updated = update(window);
    changed ||= updated !== window;
    return updated;
  });
  return changed ? { windows } : state;
}

function buildFrontState(state: BoardState, fileId: string): BoardState {
  const front = findFrontWindow(state);
  if (!front || front.file.id === fileId) return state;
  const z = buildNextZ(state);
  return buildUpdatedState(state, fileId, (window) => ({ ...window, z }));
}

function buildNextZ(state: BoardState) {
  return (findFrontWindow(state)?.z ?? 0) + 1;
}

// Encaixa na grade quando vale, sem ficar abaixo do mínimo nem passar do espaço disponível
function buildClampedSize(size: number, minimum: number, available: number, snap: number | null) {
  const snapped = snap
    ? Math.max(Math.round(size / snap) * snap, Math.ceil(minimum / snap) * snap)
    : Math.max(Math.round(size), minimum);
  return Math.min(snapped, Math.max(available, minimum));
}

function buildClampedPosition(position: number, maxPosition: number, snap: number | null) {
  const max = Math.max(0, snap ? Math.floor(maxPosition / snap) * snap : maxPosition);
  const value = snap ? Math.round(position / snap) * snap : Math.round(position);
  return Math.min(Math.max(value, 0), max);
}
