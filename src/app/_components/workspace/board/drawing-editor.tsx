"use client";

import {
  Circle,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  MoveUpRight,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { type KeyboardEvent, type MouseEvent, type PointerEvent, useCallback, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { FOCUS, ICON_BUTTON, POPOVER } from "@/app/_components/ui";
import { useAutosave } from "@/app/_components/workspace/board/autosave";
import {
  type UpdateDrawingContentActionResult,
  updateDrawingContentAction,
} from "@/app/_components/workspace/board/file-actions";
import {
  DRAWING_COLORS,
  type DrawingAction,
  type DrawingColor,
  type DrawingElement,
  type DrawingHistory,
  LINE_HEIGHT_RATIO,
  type Point,
  STROKE_WIDTHS,
  type ShapeKind,
  type StrokeWidth,
  TEXT_FONT_SIZE,
  buildDrawingContent,
  buildDrawingHistory,
  buildElementBounds,
  buildMovedElement,
  buildShapeElement,
  findElementAt,
  parseDrawingScene,
} from "@/lib/drawing/scene";

// Espera o Usuário parar de desenhar antes de salvar
const SAVE_DELAY_MS = 800;
// Distância mínima, em pixels, entre dois pontos do lápis, para o traço não guardar pontos à toa
const PEN_MIN_STEP = 2;
// Forma menor que isto, em pixels, é um clique sem querer e não vira elemento
const MIN_SHAPE_SIZE = 3;
const SELECTION_PADDING = 6;
const ARROW_HEAD_ANGLE = Math.PI / 7;
const RETRY_MESSAGE = "Não foi possível salvar. A próxima mudança tenta de novo.";
const TRAILING_WHITESPACE = /\s+$/;

type Tool = "select" | "hand" | "pen" | ShapeKind | "text" | "eraser";

const TOOLS: { tool: Tool; label: string; shortcut: string; Icon: LucideIcon }[] = [
  { tool: "select", label: "Selecionar e mover", shortcut: "V", Icon: MousePointer2 },
  { tool: "hand", label: "Arrastar a área", shortcut: "H", Icon: Hand },
  { tool: "pen", label: "Lápis", shortcut: "P", Icon: Pencil },
  { tool: "line", label: "Linha", shortcut: "L", Icon: Minus },
  { tool: "arrow", label: "Seta", shortcut: "A", Icon: MoveUpRight },
  { tool: "rectangle", label: "Retângulo", shortcut: "R", Icon: Square },
  { tool: "ellipse", label: "Elipse", shortcut: "O", Icon: Circle },
  { tool: "text", label: "Texto", shortcut: "T", Icon: Type },
  { tool: "eraser", label: "Borracha", shortcut: "E", Icon: Eraser },
];
const TOOL_BY_SHORTCUT = new Map(TOOLS.map(({ tool, shortcut }) => [shortcut.toLowerCase(), tool]));
const SHAPE_TOOLS = new Set<Tool>(["line", "arrow", "rectangle", "ellipse"]);

// A cena guarda o nome; aqui ele vira o token, que troca sozinho com o tema do Quadro
const COLOR_VALUES: Record<DrawingColor, string> = {
  ink: "var(--color-text)",
  red: "var(--color-type-video)",
  blue: "var(--color-type-note)",
  green: "var(--color-type-image)",
  purple: "var(--color-type-drawing)",
  orange: "var(--color-type-pdf)",
};
const COLOR_LABELS: Record<DrawingColor, string> = {
  ink: "Tinta",
  red: "Vermelho",
  blue: "Azul",
  green: "Verde",
  purple: "Roxo",
  orange: "Laranja",
};
const WIDTH_LABELS: Record<StrokeWidth, string> = { 2: "Fina", 4: "Média", 8: "Grossa" };
const TOOL_CURSORS: Record<Tool, string> = {
  select: "cursor-default",
  hand: "cursor-grab",
  pen: "cursor-crosshair",
  line: "cursor-crosshair",
  arrow: "cursor-crosshair",
  rectangle: "cursor-crosshair",
  ellipse: "cursor-crosshair",
  text: "cursor-text",
  eraser: "cursor-crosshair",
};

type SaveFailure = Exclude<UpdateDrawingContentActionResult, { ok: true }>["reason"] | "inesperado";
const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  "desenho-invalido": "O Desenho ficou grande demais e não foi salvo.",
  "desenho-nao-encontrado": "Este Desenho não existe mais e não foi salvo.",
  "entrada-invalida": RETRY_MESSAGE,
  inesperado: RETRY_MESSAGE,
};

// Gesto em andamento: só vira passo do histórico ao soltar, para desfazer voltar o gesto inteiro
type Gesture =
  | { kind: "draw"; element: DrawingElement; start: Point }
  | { kind: "move"; ids: string[]; start: Point; delta: Point }
  | { kind: "erase"; ids: string[] }
  | { kind: "pan"; start: Point; origin: Point };

type TextEdit = { id: string; x: number; y: number; value: string; color: DrawingColor; isNew: boolean };

type DrawingEditorProps = {
  fileId: string;
  name: string;
  initialContent: string;
  onContentChange: (content: string) => void;
};

// Quadro de desenho da Janela: ocupa a Janela inteira, que o Usuário redimensiona, e salva sozinho
export function DrawingEditor({ fileId, name, initialContent, onContentChange }: DrawingEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Conteúdo salvo fora do formato, como um Desenho antigo do Excalidraw, abre vazio
  const [history, setHistory] = useState<DrawingHistory>(() => ({
    elements: parseDrawingScene(initialContent)?.elements ?? [],
    past: [],
    future: [],
  }));
  const historyRef = useRef(history);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<DrawingColor>("ink");
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(2);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null);
  // Espelho síncrono do texto em edição: o blur do campo e o clique na área chegam juntos e só um pode confirmar
  const textEditRef = useRef<TextEdit | null>(null);
  const { status, schedule } = useAutosave(
    initialContent,
    (content: string) => updateDrawingContentAction({ fileId, content }),
    { delayMs: SAVE_DELAY_MS, warnOnLeave: true },
  );

  function commit(action: DrawingAction) {
    const current = historyRef.current;
    const next = buildDrawingHistory(current, action);
    if (next === current) return;
    historyRef.current = next;
    setHistory(next);
    const content = buildDrawingContent({ version: 1, elements: next.elements });
    onContentChange(content);
    schedule(content);
  }

  function toScenePoint(event: { clientX: number; clientY: number }): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    return {
      x: buildRounded(event.clientX - (rect?.left ?? 0) - pan.x),
      y: buildRounded(event.clientY - (rect?.top ?? 0) - pan.y),
    };
  }

  function startGesture(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    if (textEditRef.current) {
      finishTextEdit();
      return;
    }
    containerRef.current?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toScenePoint(event);
    const style = { color, strokeWidth };
    const hitId = findElementAt(historyRef.current.elements, point);

    if (tool === "hand") {
      setGesture({ kind: "pan", start: { x: event.clientX, y: event.clientY }, origin: pan });
    } else if (tool === "select") {
      setSelectedId(hitId ?? null);
      if (hitId) setGesture({ kind: "move", ids: [hitId], start: point, delta: { x: 0, y: 0 } });
    } else if (tool === "eraser") {
      setGesture({ kind: "erase", ids: hitId ? [hitId] : [] });
    } else if (tool === "pen") {
      const element: DrawingElement = { kind: "pen", id: crypto.randomUUID(), points: [[point.x, point.y]], ...style };
      setGesture({ kind: "draw", element, start: point });
    } else if (tool === "text") {
      // Sem isto, o foco que o navegador dá ao contêiner depois do pointerdown tira o foco do campo recém-aberto,
      // e o blur confirma o texto vazio, fechando o campo na hora
      event.preventDefault();
      startTextEdit(point, hitId);
    } else if (SHAPE_TOOLS.has(tool)) {
      const element = buildShapeElement(tool as ShapeKind, crypto.randomUUID(), point, point, style);
      setGesture({ kind: "draw", element, start: point });
    }
  }

  function continueGesture(event: PointerEvent<SVGSVGElement>) {
    if (!gesture) return;
    const point = toScenePoint(event);
    if (gesture.kind === "pan") {
      setPan({ x: gesture.origin.x + event.clientX - gesture.start.x, y: gesture.origin.y + event.clientY - gesture.start.y });
    } else if (gesture.kind === "move") {
      setGesture({ ...gesture, delta: { x: point.x - gesture.start.x, y: point.y - gesture.start.y } });
    } else if (gesture.kind === "erase") {
      const hitId = findElementAt(historyRef.current.elements, point);
      if (hitId && !gesture.ids.includes(hitId)) setGesture({ ...gesture, ids: [...gesture.ids, hitId] });
    } else if (gesture.element.kind === "pen") {
      const [lastX, lastY] = gesture.element.points.at(-1) ?? [point.x, point.y];
      if (Math.hypot(point.x - lastX, point.y - lastY) < PEN_MIN_STEP) return;
      setGesture({ ...gesture, element: { ...gesture.element, points: [...gesture.element.points, [point.x, point.y]] } });
    } else if (gesture.element.kind !== "text") {
      const { kind, id, color: shapeColor, strokeWidth: shapeWidth } = gesture.element;
      const style = { color: shapeColor, strokeWidth: shapeWidth };
      setGesture({ ...gesture, element: buildShapeElement(kind as ShapeKind, id, gesture.start, point, style) });
    }
  }

  function finishGesture() {
    if (!gesture) return;
    setGesture(null);
    if (gesture.kind === "move") commit({ type: "move", ids: gesture.ids, delta: gesture.delta });
    if (gesture.kind === "erase") commit({ type: "delete", ids: gesture.ids });
    if (gesture.kind === "draw" && isLargeEnough(gesture.element)) commit({ type: "add", element: gesture.element });
  }

  function updateTextEdit(next: TextEdit | null) {
    textEditRef.current = next;
    setTextEdit(next);
  }

  function startTextEdit(point: Point, hitId: string | undefined) {
    const hit = historyRef.current.elements.find((element) => element.id === hitId);
    if (hit?.kind === "text") {
      updateTextEdit({ id: hit.id, x: hit.x, y: hit.y, value: hit.text, color: hit.color, isNew: false });
      return;
    }
    updateTextEdit({ id: crypto.randomUUID(), x: point.x, y: point.y, value: "", color, isNew: true });
  }

  // Texto vazio não vira elemento; apagar todo o texto de um que já existia apaga o elemento
  function finishTextEdit() {
    const edit = textEditRef.current;
    if (!edit) return;
    updateTextEdit(null);
    const text = edit.value.replace(TRAILING_WHITESPACE, "");
    if (text === "") {
      if (!edit.isNew) commit({ type: "delete", ids: [edit.id] });
      return;
    }
    const element: DrawingElement = { kind: "text", id: edit.id, x: edit.x, y: edit.y, text, color: edit.color, fontSize: TEXT_FONT_SIZE };
    commit(edit.isNew ? { type: "add", element } : { type: "replace", element });
  }

  function editTextOnDoubleClick(event: MouseEvent<SVGSVGElement>) {
    if (tool !== "select") return;
    const point = toScenePoint(event);
    const hitId = findElementAt(historyRef.current.elements, point);
    const hit = historyRef.current.elements.find((element) => element.id === hitId);
    if (hit?.kind === "text") startTextEdit(point, hit.id);
  }

  function handleShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    const isCommand = event.ctrlKey || event.metaKey;
    if (isCommand && (key === "y" || (key === "z" && event.shiftKey))) {
      event.preventDefault();
      commit({ type: "redo" });
    } else if (isCommand && key === "z") {
      event.preventDefault();
      commit({ type: "undo" });
    } else if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
      event.preventDefault();
      commit({ type: "delete", ids: [selectedId] });
      setSelectedId(null);
    } else if (event.key === "Escape") {
      setSelectedId(null);
    } else if (!isCommand && !event.altKey && TOOL_BY_SHORTCUT.has(key)) {
      chooseTool(TOOL_BY_SHORTCUT.get(key) as Tool);
    }
  }

  function chooseTool(next: Tool) {
    setTool(next);
    if (next !== "select") setSelectedId(null);
  }

  // Na tela: o elemento sendo movido aparece no lugar novo e o que a borracha pegou some antes de soltar
  const erasingIds = new Set(gesture?.kind === "erase" ? gesture.ids : []);
  const visibleElements = history.elements
    .filter((element) => !erasingIds.has(element.id) && element.id !== textEdit?.id)
    .map((element) =>
      gesture?.kind === "move" && gesture.ids.includes(element.id) ? buildMovedElement(element, gesture.delta) : element,
    );
  const draftElement = gesture?.kind === "draw" ? gesture.element : null;
  const selected = visibleElements.find((element) => element.id === selectedId);
  const isEmpty = history.elements.length === 0 && !draftElement && !textEdit;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label={`Desenho ${name}`}
      onKeyDown={handleShortcut}
      className="flex min-h-0 flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <div role="toolbar" aria-label="Ferramentas do Desenho" className="flex flex-none flex-wrap items-center gap-0.5 border-b border-border p-1">
        {TOOLS.map(({ tool: option, label, shortcut, Icon }) => (
          <button
            key={option}
            type="button"
            aria-label={`${label} (${shortcut})`}
            title={`${label} (${shortcut})`}
            aria-pressed={tool === option}
            onClick={() => chooseTool(option)}
            className={`${ICON_BUTTON} aria-pressed:bg-accent/12 aria-pressed:text-accent-text`}
          >
            <Icon size={15} strokeWidth={1.75} aria-hidden />
          </button>
        ))}
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <StylePicker
          color={color}
          strokeWidth={strokeWidth}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          aria-label="Desfazer (Ctrl+Z)"
          title="Desfazer (Ctrl+Z)"
          disabled={history.past.length === 0}
          onClick={() => commit({ type: "undo" })}
          className={ICON_BUTTON}
        >
          <Undo2 size={15} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Refazer (Ctrl+Shift+Z)"
          title="Refazer (Ctrl+Shift+Z)"
          disabled={history.future.length === 0}
          onClick={() => commit({ type: "redo" })}
          className={ICON_BUTTON}
        >
          <Redo2 size={15} aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-surface">
        <svg
          ref={svgRef}
          onPointerDown={startGesture}
          onPointerMove={continueGesture}
          onPointerUp={finishGesture}
          onPointerCancel={() => setGesture(null)}
          onDoubleClick={editTextOnDoubleClick}
          onWheel={(event) => setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }))}
          className={`size-full touch-none select-none ${gesture?.kind === "pan" ? "cursor-grabbing" : TOOL_CURSORS[tool]}`}
        >
          <g transform={`translate(${pan.x} ${pan.y})`}>
            {visibleElements.map((element) => (
              <DrawingShape key={element.id} element={element} />
            ))}
            {draftElement && <DrawingShape element={draftElement} />}
            {selected && <SelectionOutline element={selected} />}
          </g>
        </svg>

        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 grid place-content-center px-6 text-center text-ui text-text-muted">
            Escolha uma ferramenta e desenhe aqui.
          </p>
        )}

        {textEdit && (
          <textarea
            autoFocus
            value={textEdit.value}
            onChange={(event) => updateTextEdit({ ...textEdit, value: event.target.value })}
            onBlur={finishTextEdit}
            onKeyDown={(event) => {
              if (event.key === "Escape" || (event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
                event.preventDefault();
                finishTextEdit();
              }
            }}
            aria-label="Texto do Desenho"
            rows={Math.max(textEdit.value.split("\n").length, 1)}
            style={{
              left: textEdit.x + pan.x,
              top: textEdit.y + pan.y,
              fontSize: TEXT_FONT_SIZE,
              lineHeight: LINE_HEIGHT_RATIO,
              color: COLOR_VALUES[textEdit.color],
            }}
            className="absolute min-w-16 resize-none overflow-hidden border border-dashed border-accent bg-transparent p-0 whitespace-pre outline-none [field-sizing:content]"
          />
        )}
      </div>

      <p
        role="status"
        className={`flex h-6 flex-none items-center truncate border-t border-border px-3 font-mono text-meta ${
          status.kind === "error" ? "text-danger" : "text-text-muted"
        }`}
      >
        {status.kind === "error" ? FAILURE_MESSAGES[status.reason] : status.kind === "saving" ? "Salvando…" : "Salvo"}
      </p>
    </div>
  );
}

function StylePicker({
  color,
  strokeWidth,
  onColorChange,
  onStrokeWidthChange,
}: {
  color: DrawingColor;
  strokeWidth: StrokeWidth;
  onColorChange: (color: DrawingColor) => void;
  onStrokeWidthChange: (width: StrokeWidth) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Cor e espessura: ${COLOR_LABELS[color]}, ${WIDTH_LABELS[strokeWidth]}`}
        title="Cor e espessura"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={ICON_BUTTON}
      >
        <span aria-hidden className="size-4 rounded-full border border-border" style={{ backgroundColor: COLOR_VALUES[color] }} />
      </button>
      {isOpen && (
        <div role="dialog" aria-label="Cor e espessura" className={`absolute top-9 left-0 z-10 grid w-max gap-2 p-2 ${POPOVER}`}>
          <div className="flex gap-1">
            {DRAWING_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={COLOR_LABELS[option]}
                aria-pressed={color === option}
                onClick={() => onColorChange(option)}
                className={`grid size-7 cursor-pointer place-items-center rounded-md aria-pressed:bg-accent/12 hover:bg-surface-2 ${FOCUS}`}
              >
                <span aria-hidden className="size-4 rounded-full border border-border" style={{ backgroundColor: COLOR_VALUES[option] }} />
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {STROKE_WIDTHS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Espessura ${WIDTH_LABELS[option].toLowerCase()}`}
                aria-pressed={strokeWidth === option}
                onClick={() => onStrokeWidthChange(option)}
                className={`grid h-7 flex-1 cursor-pointer place-items-center rounded-md px-2 aria-pressed:bg-accent/12 hover:bg-surface-2 ${FOCUS}`}
              >
                <svg aria-hidden width="28" height="10" className="text-text">
                  <line x1="2" y1="5" x2="26" y2="5" stroke="currentColor" strokeWidth={option} strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DrawingShape({ element }: { element: DrawingElement }) {
  const stroke = COLOR_VALUES[element.color];
  if (element.kind === "text") {
    return (
      <text x={element.x} y={element.y} fontSize={element.fontSize} fill={stroke} xmlSpace="preserve">
        {element.text.split("\n").map((line, index) => (
          <tspan key={index} x={element.x} dy={index === 0 ? element.fontSize : element.fontSize * LINE_HEIGHT_RATIO}>
            {line || " "}
          </tspan>
        ))}
      </text>
    );
  }

  const strokeProps = {
    stroke,
    strokeWidth: element.strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  switch (element.kind) {
    case "pen":
      return <path d={buildPenPath(element.points)} {...strokeProps} />;
    case "line":
      return <line x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} {...strokeProps} />;
    case "arrow":
      return (
        <g {...strokeProps}>
          <line x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
          <polyline points={buildArrowHeadPoints(element.start, element.end, element.strokeWidth)} />
        </g>
      );
    case "rectangle":
      return <rect x={element.x} y={element.y} width={element.width} height={element.height} rx={4} {...strokeProps} />;
    case "ellipse":
      return (
        <ellipse
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          rx={element.width / 2}
          ry={element.height / 2}
          {...strokeProps}
        />
      );
  }
}

function SelectionOutline({ element }: { element: DrawingElement }) {
  const bounds = buildElementBounds(element);
  return (
    <rect
      x={bounds.x - SELECTION_PADDING}
      y={bounds.y - SELECTION_PADDING}
      width={bounds.width + 2 * SELECTION_PADDING}
      height={bounds.height + 2 * SELECTION_PADDING}
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth={1}
      strokeDasharray="4 4"
      pointerEvents="none"
    />
  );
}

// Um ponto só vira um traço mínimo, para o clique do lápis deixar uma marca
function buildPenPath(points: [number, number][]) {
  const [[firstX, firstY], ...rest] = points;
  if (rest.length === 0) return `M ${firstX} ${firstY} l 0.01 0`;
  return `M ${firstX} ${firstY} ${rest.map(([x, y]) => `L ${x} ${y}`).join(" ")}`;
}

// As duas abas da ponta da seta, com tamanho que acompanha a espessura
function buildArrowHeadPoints(start: Point, end: Point, strokeWidth: number) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 10 + strokeWidth * 2;
  const left = { x: end.x - size * Math.cos(angle - ARROW_HEAD_ANGLE), y: end.y - size * Math.sin(angle - ARROW_HEAD_ANGLE) };
  const right = { x: end.x - size * Math.cos(angle + ARROW_HEAD_ANGLE), y: end.y - size * Math.sin(angle + ARROW_HEAD_ANGLE) };
  return `${left.x},${left.y} ${end.x},${end.y} ${right.x},${right.y}`;
}

function isLargeEnough(element: DrawingElement) {
  if (element.kind === "pen" || element.kind === "text") return true;
  const bounds = buildElementBounds(element);
  return Math.max(bounds.width, bounds.height) >= MIN_SHAPE_SIZE;
}

// Uma casa decimal basta para o traço e deixa o JSON salvo menor
function buildRounded(value: number) {
  return Math.round(value * 10) / 10;
}
