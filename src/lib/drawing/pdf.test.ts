import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { DRAWING_PDF_MARGIN, MAX_PDF_PAGE_SIZE, buildDrawingPdf } from "@/lib/drawing/pdf";
import { type DrawingElement, buildDrawingContent } from "@/lib/drawing/scene";

const A4 = { width: 595.28, height: 841.89 };

async function getPageSize(bytes: Uint8Array) {
  const document = await PDFDocument.load(bytes);
  const { width, height } = document.getPage(0).getSize();
  return { width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100 };
}

function buildContent(elements: DrawingElement[]) {
  return buildDrawingContent({ version: 1, elements });
}

describe("buildDrawingPdf", () => {
  it("cria uma página do tamanho do Desenho, com margem em volta", async () => {
    const content = buildContent([
      { kind: "rectangle", id: "r", x: 100, y: 50, width: 200, height: 100, color: "ink", strokeWidth: 2 },
      { kind: "line", id: "l", start: { x: -20, y: 80 }, end: { x: 40, y: 120 }, color: "red", strokeWidth: 4 },
    ]);

    expect(await getPageSize(await buildDrawingPdf(content))).toEqual({
      width: 320 + 2 * DRAWING_PDF_MARGIN,
      height: 100 + 2 * DRAWING_PDF_MARGIN,
    });
  });

  it("cria um PDF com todos os tipos de elemento do editor", async () => {
    const content = buildContent([
      { kind: "pen", id: "p", points: [[0, 0], [10, 10], [20, 5]], color: "blue", strokeWidth: 2 },
      { kind: "pen", id: "ponto", points: [[30, 30]], color: "blue", strokeWidth: 8 },
      { kind: "arrow", id: "a", start: { x: 0, y: 50 }, end: { x: 80, y: 50 }, color: "green", strokeWidth: 4 },
      { kind: "ellipse", id: "e", x: 10, y: 60, width: 60, height: 30, color: "purple", strokeWidth: 2 },
      { kind: "text", id: "t", x: 0, y: 100, text: "Limite\nde x→0", color: "orange", fontSize: 20 },
    ]);

    expect((await PDFDocument.load(await buildDrawingPdf(content))).getPageCount()).toBe(1);
  });

  it("reduz o Desenho maior que a página máxima do PDF, mantendo a proporção", async () => {
    const content = buildContent([
      { kind: "line", id: "l", start: { x: 0, y: 0 }, end: { x: 50_000, y: 25_000 }, color: "ink", strokeWidth: 2 },
    ]);

    const { width, height } = await getPageSize(await buildDrawingPdf(content));

    expect({ width, ratio: Math.round((width / height) * 100) / 100 }).toEqual({
      width: MAX_PDF_PAGE_SIZE,
      ratio: Math.round(((50_000 + 2 * DRAWING_PDF_MARGIN) / (25_000 + 2 * DRAWING_PDF_MARGIN)) * 100) / 100,
    });
  });

  it("cria uma página A4 em branco para o Desenho vazio", async () => {
    expect(await getPageSize(await buildDrawingPdf(buildContent([])))).toEqual(A4);
  });

  it("troca o caractere que a fonte do PDF não tem, sem falhar", async () => {
    const content = buildContent([
      { kind: "text", id: "t", x: 0, y: 0, text: "Cálculo 🚀 ção ∫", color: "ink", fontSize: 20 },
    ]);

    await expect(buildDrawingPdf(content)).resolves.toBeInstanceOf(Uint8Array);
  });

  it("cria uma página A4 em branco quando o conteúdo salvo está fora do formato", async () => {
    expect(await getPageSize(await buildDrawingPdf("{quebrado"))).toEqual(A4);
  });
});
