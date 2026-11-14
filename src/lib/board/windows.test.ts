import { describe, expect, it } from "vitest";
import type { FileType } from "@/db/schema";
import {
  type BoardContext,
  type BoardState,
  DEFAULT_WINDOW_SIZES,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  buildBoardState,
  buildPlacedRect,
  buildWindowCounts,
  findFrontWindow,
} from "@/lib/board/windows";

const AREA = { width: 1200, height: 800 };
const FREE: BoardContext = { area: AREA, snap: null };
const EMPTY: BoardState = { windows: [] };

describe("buildBoardState: abrir", () => {
  it("abre o Arquivo numa Janela com o tamanho padrão do tipo, na posição pedida", () => {
    const state = open(EMPTY, buildFile("nota", "note"), { x: 100, y: 50 });

    expect(state.windows).toEqual([
      {
        file: { id: "nota", type: "note", name: "nota" },
        rect: { x: 100, y: 50, ...DEFAULT_WINDOW_SIZES.note },
        restoreRect: null,
        z: 1,
      },
    ]);
  });

  it("abre em cascata quando não recebe posição", () => {
    const first = open(EMPTY, buildFile("a", "note"));
    const second = open(first, buildFile("b", "note"));

    expect(second.windows.map((window) => [window.rect.x, window.rect.y])).toEqual([
      [24, 24],
      [48, 48],
    ]);
  });

  it("abre a 10ª Janela", () => {
    const state = openMany(9, "note");

    expect(open(state, buildFile("decima", "note")).windows).toHaveLength(10);
  });

  it("recusa a 11ª Janela", () => {
    const state = openMany(10, "note");

    expect(buildBoardState(state, { type: "open", file: buildFile("extra", "note") }, FREE)).toEqual({
      ok: false,
      reason: "limite-de-janelas",
    });
  });

  it("abre o 2º Vídeo", () => {
    const state = open(EMPTY, buildFile("video-1", "video"));

    expect(open(state, buildFile("video-2", "video")).windows).toHaveLength(2);
  });

  it("recusa o 3º Vídeo", () => {
    const state = open(open(EMPTY, buildFile("video-1", "video")), buildFile("video-2", "video"));

    expect(buildBoardState(state, { type: "open", file: buildFile("video-3", "video") }, FREE)).toEqual({
      ok: false,
      reason: "limite-de-videos",
    });
  });

  it("só traz para a frente o Arquivo que já está aberto, mesmo no limite", () => {
    const state = openMany(10, "note");

    const reopened = open(state, buildFile("note-0", "note"), { x: 500, y: 500 });

    expect({
      count: reopened.windows.length,
      front: findFrontWindow(reopened)?.file.id,
      rect: findFrontWindow(reopened)?.rect,
    }).toEqual({ count: 10, front: "note-0", rect: state.windows[0].rect });
  });

  it("prende a Janela nova dentro da área", () => {
    const state = open(EMPTY, buildFile("pdf", "pdf"), { x: 5000, y: -40 });

    expect(state.windows[0].rect).toEqual({
      x: AREA.width - DEFAULT_WINDOW_SIZES.pdf.width,
      y: 0,
      ...DEFAULT_WINDOW_SIZES.pdf,
    });
  });

  it("encaixa a Janela nova na grade quando o encaixe está ligado", () => {
    const state = expectOk(buildBoardState(EMPTY, { type: "open", file: buildFile("nota", "note"), position: { x: 37, y: 13 } }, { area: AREA, snap: 24 }));

    expect(state.windows[0].rect).toEqual({ x: 48, y: 24, width: 384, height: 384 });
  });
});

describe("buildBoardState: focar", () => {
  it("traz a Janela clicada para a frente", () => {
    const state = open(open(EMPTY, buildFile("a", "note")), buildFile("b", "note"));

    const focused = apply(state, { type: "focus", fileId: "a" });

    expect(findFrontWindow(focused)?.file.id).toBe("a");
  });

  it("mantém a ordem de abertura ao trazer para a frente", () => {
    const state = open(open(EMPTY, buildFile("a", "note")), buildFile("b", "note"));

    const focused = apply(state, { type: "focus", fileId: "a" });

    expect(focused.windows.map((window) => window.file.id)).toEqual(["a", "b"]);
  });

  it("devolve o mesmo estado ao focar a Janela que já está na frente", () => {
    const state = open(open(EMPTY, buildFile("a", "note")), buildFile("b", "note"));

    expect(apply(state, { type: "focus", fileId: "b" })).toBe(state);
  });
});

describe("buildBoardState: mover", () => {
  it("move a Janela para a posição e a traz para a frente", () => {
    const state = open(open(EMPTY, buildFile("a", "note")), buildFile("b", "note"));

    const moved = apply(state, { type: "move", fileId: "a", position: { x: 300, y: 200 } });

    expect(findFrontWindow(moved)).toMatchObject({ file: { id: "a" }, rect: { x: 300, y: 200 } });
  });

  it("devolve o mesmo estado quando a posição não muda", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 100, y: 100 });

    expect(apply(state, { type: "move", fileId: "a", position: { x: 100, y: 100 } })).toBe(state);
  });

  it("prende a posição aos limites da área", () => {
    const state = open(EMPTY, buildFile("a", "note"));

    const moved = apply(state, { type: "move", fileId: "a", position: { x: -50, y: 5000 } });

    expect(moved.windows[0].rect).toMatchObject({ x: 0, y: AREA.height - DEFAULT_WINDOW_SIZES.note.height });
  });

  it("encaixa a posição no espaçamento com o encaixe ligado", () => {
    const state = open(EMPTY, buildFile("a", "image"), { x: 0, y: 0 });

    const moved = expectOk(buildBoardState(state, { type: "move", fileId: "a", position: { x: 41, y: 70 } }, { area: AREA, snap: 32 }));

    expect(moved.windows[0].rect).toMatchObject({ x: 32, y: 64 });
  });

  it("não encaixa com o encaixe desligado", () => {
    const state = open(EMPTY, buildFile("a", "image"), { x: 0, y: 0 });

    const moved = apply(state, { type: "move", fileId: "a", position: { x: 41, y: 70 } });

    expect(moved.windows[0].rect).toMatchObject({ x: 41, y: 70 });
  });
});

describe("buildBoardState: redimensionar", () => {
  it("muda o tamanho da Janela", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 0, y: 0 });

    const resized = apply(state, { type: "resize", fileId: "a", size: { width: 500, height: 420 } });

    expect(resized.windows[0].rect).toEqual({ x: 0, y: 0, width: 500, height: 420 });
  });

  it("respeita o tamanho mínimo", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 0, y: 0 });

    const resized = apply(state, { type: "resize", fileId: "a", size: { width: 10, height: 10 } });

    expect(resized.windows[0].rect).toMatchObject({ width: MIN_WINDOW_WIDTH, height: MIN_WINDOW_HEIGHT });
  });

  it("não deixa a Janela passar da borda da área", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 600, y: 300 });

    const resized = apply(state, { type: "resize", fileId: "a", size: { width: 900, height: 900 } });

    expect(resized.windows[0].rect).toEqual({ x: 600, y: 300, width: 600, height: 500 });
  });

  it("encaixa o tamanho no espaçamento, sem ficar abaixo do mínimo", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 0, y: 0 });

    const resized = expectOk(
      buildBoardState(state, { type: "resize", fileId: "a", size: { width: 205, height: 333 } }, { area: AREA, snap: 16 }),
    );

    expect(resized.windows[0].rect).toMatchObject({ width: 224, height: 336 });
  });
});

describe("buildBoardState: maximizar e restaurar", () => {
  it("ocupa a área inteira ao maximizar", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 100, y: 100 });

    const maximized = apply(state, { type: "toggle-maximize", fileId: "a" });

    expect(maximized.windows[0].rect).toEqual({ x: 0, y: 0, ...AREA });
  });

  it("volta ao tamanho e à posição anteriores ao restaurar", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 100, y: 100 });
    const original = state.windows[0].rect;

    const restored = apply(apply(state, { type: "toggle-maximize", fileId: "a" }), { type: "toggle-maximize", fileId: "a" });

    expect(restored.windows[0]).toMatchObject({ rect: original, restoreRect: null });
  });

  it("acompanha a área quando ela muda com a Janela maximizada", () => {
    const state = apply(open(EMPTY, buildFile("a", "note")), { type: "toggle-maximize", fileId: "a" });

    const fitted = expectOk(buildBoardState(state, { type: "fit-area" }, { area: { width: 900, height: 600 }, snap: null }));

    expect(fitted.windows[0].rect).toEqual({ x: 0, y: 0, width: 900, height: 600 });
  });

  it("devolve o mesmo estado quando a área não muda as Janelas", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 100, y: 100 });

    expect(apply(state, { type: "fit-area" })).toBe(state);
  });

  it("prende as Janelas na área menor", () => {
    const state = open(EMPTY, buildFile("a", "note"), { x: 800, y: 400 });

    const fitted = expectOk(buildBoardState(state, { type: "fit-area" }, { area: { width: 900, height: 600 }, snap: null }));

    expect(fitted.windows[0].rect).toMatchObject({ x: 900 - 380, y: 600 - 380 });
  });
});

describe("buildBoardState: fechar", () => {
  it("fecha a Janela", () => {
    const state = open(open(EMPTY, buildFile("a", "note")), buildFile("b", "note"));

    expect(apply(state, { type: "close", fileId: "a" }).windows.map((window) => window.file.id)).toEqual(["b"]);
  });

  it("libera a vaga do Vídeo ao fechar", () => {
    const state = open(open(EMPTY, buildFile("video-1", "video")), buildFile("video-2", "video"));
    const closed = apply(state, { type: "close", fileId: "video-1" });

    expect(open(closed, buildFile("video-3", "video")).windows).toHaveLength(2);
  });

  it("esvazia o Quadro ao fechar todas", () => {
    const state = openMany(4, "note");

    expect(apply(state, { type: "close-all" })).toEqual(EMPTY);
  });
});

describe("buildWindowCounts", () => {
  it("conta Janelas e Vídeos e marca só o limite que chegou", () => {
    const state = open(open(open(EMPTY, buildFile("v1", "video")), buildFile("v2", "video")), buildFile("n", "note"));

    expect(buildWindowCounts(state)).toEqual({ windows: 3, videos: 2, isWindowsFull: false, isVideosFull: true });
  });

  it("marca o limite de Janelas com 10 abertas", () => {
    expect(buildWindowCounts(openMany(10, "note"))).toMatchObject({ windows: 10, isWindowsFull: true, isVideosFull: false });
  });
});

describe("buildPlacedRect", () => {
  it("só prende à área quando não há espaçamento de encaixe", () => {
    expect(buildPlacedRect({ x: 41, y: 70, width: 300, height: 200 }, { area: AREA, snap: null })).toEqual({
      x: 41,
      y: 70,
      width: 300,
      height: 200,
    });
  });
});

function buildFile(id: string, type: FileType) {
  return { id, type, name: id };
}

function open(state: BoardState, file: ReturnType<typeof buildFile>, position?: { x: number; y: number }) {
  return apply(state, { type: "open", file, position });
}

function openMany(total: number, type: FileType) {
  let state = EMPTY;
  for (let index = 0; index < total; index++) state = open(state, buildFile(`${type}-${index}`, type));
  return state;
}

function apply(state: BoardState, action: Parameters<typeof buildBoardState>[1]) {
  return expectOk(buildBoardState(state, action, FREE));
}

function expectOk(result: ReturnType<typeof buildBoardState>) {
  if (!result.ok) throw new Error(`unexpected refusal: ${result.reason}`);
  return result.state;
}
