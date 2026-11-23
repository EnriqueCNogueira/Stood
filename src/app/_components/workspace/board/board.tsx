"use client";

import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BELOW_HEADER } from "@/app/_components/ui";
import { useAutosave } from "@/app/_components/workspace/board/autosave";
import { updateBoardWindowsAction } from "@/app/_components/workspace/board/board-actions";
import { BoardArea } from "@/app/_components/workspace/board/board-area";
import { BoardBar } from "@/app/_components/workspace/board/board-bar";
import { type Notice, BoardNotice } from "@/app/_components/workspace/board/board-notice";
import { BoardSettings } from "@/app/_components/workspace/board/board-settings";
import { BoardSidebar } from "@/app/_components/workspace/board/board-sidebar";
import { isFromButton } from "@/app/_components/workspace/board/board-window";
import { useStoredValue } from "@/app/_components/workspace/local-storage";
import {
  BOARD_PREFERENCES_STORAGE_KEY,
  BOARD_SIDEBAR_COLLAPSED_STORAGE_KEY,
  type BoardPreferences,
  buildBoardSnap,
  parseBoardPreferences,
} from "@/lib/board/preferences";
import {
  type BoardAction,
  type BoardContext,
  type BoardFile,
  type BoardContents,
  type BoardState,
  DEFAULT_WINDOW_SIZES,
  MAX_VIDEO_WINDOWS,
  MAX_WINDOWS,
  type Point,
  type Rect,
  type Size,
  type StoredBoardWindow,
  buildBoardState,
  buildOpenRect,
  buildPlacedRect,
  buildRestoredBoardState,
  buildStoredWindows,
  buildWindowCounts,
  isMaximized,
  isSameRect,
} from "@/lib/board/windows";
import type { StoodDetails } from "@/lib/stood/details";
import { type StoodTreeFile, type StoodWithTree, buildTreeFiles, buildTreeWithFile } from "@/lib/stood/tree";

// Distância mínima, em pixels, para um clique virar arrasto
const DRAG_THRESHOLD = 4;
// O cursor fica no meio da barra da Janela que vai abrir, que tem h-9
const OPEN_GRAB_OFFSET_Y = 18;
// Abaixo de md, as Janelas ficam em coluna e não se arrastam
const COMPACT_QUERY = "(max-width: 47.9375rem)";
// Curto para recarregar logo depois de mover não perder a mudança; o arrasto só muda o estado ao soltar
const BOARD_SAVE_DELAY_MS = 300;
const BOARD_SAVE_FAILED_MESSAGE = "Não foi possível salvar o Quadro. A próxima mudança tenta de novo.";

const LIMIT_MESSAGES = {
  "limite-de-janelas": `O Quadro já tem ${MAX_WINDOWS} Janelas abertas. Feche uma para abrir outra.`,
  "limite-de-videos": `O Quadro já tem ${MAX_VIDEO_WINDOWS} Vídeos abertos. Feche um para abrir outro.`,
};

type Drag =
  | { kind: "move"; fileId: string; start: Point; grab: Point; size: Size; started: boolean }
  | { kind: "open"; file: BoardFile; start: Point; started: boolean }
  | { kind: "resize"; fileId: string; start: Point; size: Size };

// Área medida uma vez no começo do arrasto, para não ler o layout a cada movimento
type DragArea = { left: number; top: number; context: BoardContext; liveContext: BoardContext };

type BoardProps = {
  stood: StoodWithTree & { boardWindows: StoredBoardWindow[] };
  editableContents: Record<string, string>;
};

// Raiz do Quadro: abre com as Janelas salvas, salva cada mudança e liga a barra, a lateral e a área
export function Board({ stood, editableContents }: BoardProps) {
  const [details, setDetails] = useState<StoodDetails>({ name: stood.name, description: stood.description });
  // O Arquivo criado entra direto na árvore, sem renderizar a página de novo
  const [tree, setTree] = useState(stood.tree);
  // Reabrir uma Nota mostra o que foi digitado nela, mesmo que a página não tenha sido carregada de novo
  const contentsRef = useRef(new Map(Object.entries(editableContents)));
  const contents = useMemo<BoardContents>(
    () => ({
      getContent: (fileId) => contentsRef.current.get(fileId) ?? "",
      setContent: (fileId, content) => contentsRef.current.set(fileId, content),
    }),
    [],
  );
  const [state, setState] = useState<BoardState>(() =>
    buildRestoredBoardState(stood.boardWindows, buildTreeFiles(stood.tree).map(buildBoardFile)),
  );
  const stateRef = useRef(state);
  const [outline, setOutline] = useState<Rect | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [storedPreferences, setStoredPreferences] = useStoredValue(BOARD_PREFERENCES_STORAGE_KEY);
  const [storedCollapsed, setStoredCollapsed] = useStoredValue(BOARD_SIDEBAR_COLLAPSED_STORAGE_KEY);
  const preferences = useMemo(() => parseBoardPreferences(storedPreferences), [storedPreferences]);
  const isCompact = useSyncExternalStore(subscribeToCompact, isCompactScreen, () => false);
  const areaRef = useRef<HTMLDivElement>(null);
  const stopDragRef = useRef<(() => void) | null>(null);
  const snap = buildBoardSnap(preferences);
  const { status: saveStatus, schedule: scheduleSave } = useAutosave(
    stood.boardWindows,
    (windows: StoredBoardWindow[]) => updateBoardWindowsAction({ stoodId: stood.id, windows }),
    { delayMs: BOARD_SAVE_DELAY_MS, warnOnLeave: false },
  );

  // O reducer devolve o mesmo estado quando nada muda, e aí a tela não redesenha
  const dispatch = useCallback(
    (action: BoardAction, context: BoardContext) => {
      const result = buildBoardState(stateRef.current, action, context);
      if (!result.ok) {
        // Objeto novo a cada recusa, para o aviso reiniciar o tempo mesmo com o mesmo texto
        setNotice({ message: LIMIT_MESSAGES[result.reason] });
        return;
      }
      if (result.state === stateRef.current) return;
      stateRef.current = result.state;
      setState(result.state);
      // Prender as Janelas numa tela menor não salva: abrir de novo numa tela maior mantém o Quadro como estava
      if (action.type !== "fit-area") scheduleSave(buildStoredWindows(result.state));
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (saveStatus.kind === "error") setNotice({ message: BOARD_SAVE_FAILED_MESSAGE });
  }, [saveStatus]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  // Mudar o tamanho da tela ou da lateral prende as Janelas de novo na área
  useEffect(() => {
    const area = areaRef.current;
    if (!area || isCompact) return;
    const observer = new ResizeObserver(() =>
      dispatch({ type: "fit-area" }, { area: { width: area.clientWidth, height: area.clientHeight }, snap: null }),
    );
    observer.observe(area);
    return () => observer.disconnect();
  }, [dispatch, isCompact]);

  useEffect(() => () => stopDragRef.current?.(), []);

  useEffect(() => {
    if (!isDrawerOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isDrawerOpen]);

  function getContext(withSnap = true): BoardContext {
    const area = areaRef.current;
    return { area: { width: area?.clientWidth ?? 0, height: area?.clientHeight ?? 0 }, snap: withSnap ? snap : null };
  }

  function getDragArea(): DragArea | undefined {
    const area = areaRef.current;
    if (!area) return undefined;
    const { left, top } = area.getBoundingClientRect();
    return { left, top, context: getContext(), liveContext: getContext(false) };
  }

  // O contorno tracejado mostra onde a Janela vai ficar, já preso à área e encaixado na grade
  function buildDragOutline(drag: Exclude<Drag, { kind: "resize" }>, pointer: Point, dragArea: DragArea): Rect | null {
    const x = pointer.x - dragArea.left;
    const y = pointer.y - dragArea.top;
    const { area } = dragArea.context;
    if (drag.kind === "move") {
      return buildPlacedRect({ x: x - drag.grab.x, y: y - drag.grab.y, ...drag.size }, dragArea.context);
    }
    const isInside = x >= 0 && y >= 0 && x <= area.width && y <= area.height;
    if (!isInside) return null;
    const { width } = DEFAULT_WINDOW_SIZES[drag.file.type];
    return buildOpenRect(drag.file.type, { x: x - width / 2, y: y - OPEN_GRAB_OFFSET_Y }, dragArea.context);
  }

  // Acompanha o ponteiro na janela do navegador até soltar, para o arrasto seguir mesmo fora do elemento
  function handleDrag(initial: Drag) {
    const dragArea = getDragArea();
    if (!dragArea) return;
    stopDragRef.current?.();
    let drag = initial;
    let latestOutline: Rect | null = null;

    function buildResizeSize(pointer: Point, resize: Extract<Drag, { kind: "resize" }>): Size {
      return { width: resize.size.width + pointer.x - resize.start.x, height: resize.size.height + pointer.y - resize.start.y };
    }

    function handleMove(event: globalThis.PointerEvent) {
      const pointer = { x: event.clientX, y: event.clientY };
      if (drag.kind === "resize") {
        dispatch({ type: "resize", fileId: drag.fileId, size: buildResizeSize(pointer, drag) }, dragArea!.liveContext);
        return;
      }
      if (!drag.started) {
        if (Math.hypot(pointer.x - drag.start.x, pointer.y - drag.start.y) < DRAG_THRESHOLD) return;
        drag = { ...drag, started: true };
        document.body.style.cursor = "grabbing";
      }
      const next = buildDragOutline(drag, pointer, dragArea!);
      if (isSameRect(next, latestOutline)) return;
      latestOutline = next;
      setOutline(next);
    }

    function handleUp(event: globalThis.PointerEvent) {
      stop();
      if (drag.kind === "resize") {
        const pointer = { x: event.clientX, y: event.clientY };
        dispatch({ type: "resize", fileId: drag.fileId, size: buildResizeSize(pointer, drag) }, dragArea!.context);
        return;
      }
      if (!drag.started || !latestOutline) return;
      const position = { x: latestOutline.x, y: latestOutline.y };
      if (drag.kind === "move") dispatch({ type: "move", fileId: drag.fileId, position }, dragArea!.context);
      else dispatch({ type: "open", file: drag.file, position }, dragArea!.context);
    }

    function stop() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      delete document.body.dataset.boardDragging;
      stopDragRef.current = null;
      setOutline(null);
    }

    document.body.style.userSelect = "none";
    document.body.dataset.boardDragging = "";
    if (drag.kind === "resize") document.body.style.cursor = "nwse-resize";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", stop);
    stopDragRef.current = stop;
  }

  function startMove(fileId: string, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || isCompact || isFromButton(event.target)) return;
    const target = stateRef.current.windows.find((window) => window.file.id === fileId);
    const areaRect = areaRef.current?.getBoundingClientRect();
    if (!target || !areaRect || isMaximized(target)) return;
    event.preventDefault();
    const { x, y, width, height } = target.rect;
    handleDrag({
      kind: "move",
      fileId,
      start: { x: event.clientX, y: event.clientY },
      grab: { x: event.clientX - areaRect.left - x, y: event.clientY - areaRect.top - y },
      size: { width, height },
      started: false,
    });
  }

  function startResize(fileId: string, event: PointerEvent<HTMLElement>) {
    const target = stateRef.current.windows.find((window) => window.file.id === fileId);
    if (event.button !== 0 || !target) return;
    event.preventDefault();
    handleDrag({
      kind: "resize",
      fileId,
      start: { x: event.clientX, y: event.clientY },
      size: { width: target.rect.width, height: target.rect.height },
    });
  }

  function startOpenDrag(file: StoodTreeFile, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || isCompact) return;
    handleDrag({ kind: "open", file: buildBoardFile(file), start: { x: event.clientX, y: event.clientY }, started: false });
  }

  function openFile(file: StoodTreeFile) {
    dispatch({ type: "open", file: buildBoardFile(file) }, getContext());
    setIsDrawerOpen(false);
  }

  function changePreferences(next: BoardPreferences) {
    setStoredPreferences(JSON.stringify(next));
  }


  return (
    <div className={`flex ${BELOW_HEADER.mdHeight}`}>
      <BoardSidebar
        stoodId={stood.id}
        tree={tree}
        isCollapsed={storedCollapsed === "true"}
        isDrawerOpen={isDrawerOpen}
        onToggleCollapsed={() => setStoredCollapsed(String(storedCollapsed !== "true"))}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onFilePointerDown={startOpenDrag}
        onOpenFile={openFile}
        onFileCreated={(file) => setTree((current) => buildTreeWithFile(current, file))}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BoardBar
          stoodId={stood.id}
          details={details}
          counts={buildWindowCounts(state)}
          onDetailsSaved={setDetails}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />

        <div className="relative flex min-h-0 flex-1 px-2 pb-2 md:px-3 md:pb-3">
          <BoardArea
            areaRef={areaRef}
            state={state}
            preferences={preferences}
            outline={outline}
            isCompact={isCompact}
            contents={contents}
            onBarPointerDown={startMove}
            onResizePointerDown={startResize}
            onFocus={(fileId) => dispatch({ type: "focus", fileId }, getContext())}
            onToggleMaximize={(fileId) => dispatch({ type: "toggle-maximize", fileId }, getContext())}
            onClose={(fileId) => dispatch({ type: "close", fileId }, getContext())}
          />
          {/* A engrenagem flutua no canto do Quadro, acima das Janelas */}
          <div className="absolute top-2 right-4 z-20 md:right-5">
            <BoardSettings
              preferences={preferences}
              hasWindows={state.windows.length > 0}
              onChange={changePreferences}
              onCloseAll={() => dispatch({ type: "close-all" }, getContext())}
            />
          </div>
        </div>
      </div>

      <BoardNotice notice={notice} onDismiss={dismissNotice} />
    </div>
  );
}

function buildBoardFile(file: StoodTreeFile): BoardFile {
  return { id: file.id, type: file.type, name: file.name, videoId: file.videoId };
}

function isCompactScreen() {
  return matchMedia(COMPACT_QUERY).matches;
}

function subscribeToCompact(onChange: () => void) {
  const media = matchMedia(COMPACT_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
