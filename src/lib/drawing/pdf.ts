import { LineCapStyle, PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  type DrawingColor,
  type DrawingElement,
  LINE_HEIGHT_RATIO,
  type Point,
  buildArrowHead,
  buildElementBounds,
  buildPenPath,
  parseDrawingScene,
} from "@/lib/drawing/scene";

// Desenho em PDF vetorial, sem I/O: o Quadro gera no navegador na exportação, com os mesmos traços do editor

// Espaço em volta do Desenho, que também cobre a espessura do traço e a ponta da seta
export const DRAWING_PDF_MARGIN = 24;
// Maior lado de página que os leitores de PDF aceitam, em pontos
export const MAX_PDF_PAGE_SIZE = 14_400;
const A4_SIZE: [number, number] = [595.28, 841.89];
// Mesmo rx do retângulo do editor
const RECTANGLE_RADIUS = 4;
const MISSING_CHARACTER = "?";

// O PDF sai em papel branco, então usa as cores do tema claro (data-theme="light" de src/app/globals.css)
const COLORS: Record<DrawingColor, string> = {
  ink: "#161412",
  red: "#DC2626",
  blue: "#2563EB",
  green: "#059669",
  purple: "#9333EA",
  orange: "#EA580C",
};

type Placement = { origin: Point; scale: number };

// Conteúdo fora do formato vira página em branco, como o editor, que abre vazio
export async function buildDrawingPdf(content: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const elements = parseDrawingScene(content)?.elements ?? [];
  if (elements.length === 0) {
    document.addPage(A4_SIZE);
    return document.save();
  }

  const { page, placement } = buildPlacedPage(document, elements);
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const element of elements) drawElement(page, element, placement, font);
  return document.save();
}

// Página do tamanho do Desenho com margem; o Desenho grande demais é reduzido por inteiro
function buildPlacedPage(document: PDFDocument, elements: DrawingElement[]) {
  const bounds = elements.map(buildElementBounds);
  const minX = Math.min(...bounds.map((rect) => rect.x));
  const minY = Math.min(...bounds.map((rect) => rect.y));
  const width = Math.max(...bounds.map((rect) => rect.x + rect.width)) - minX + 2 * DRAWING_PDF_MARGIN;
  const height = Math.max(...bounds.map((rect) => rect.y + rect.height)) - minY + 2 * DRAWING_PDF_MARGIN;
  const scale = Math.min(1, MAX_PDF_PAGE_SIZE / Math.max(width, height));
  const page = document.addPage([width * scale, height * scale]);

  // O PDF conta o y de baixo para cima; a origem fica no canto de cima do Desenho, já com a margem
  const origin = { x: (DRAWING_PDF_MARGIN - minX) * scale, y: page.getHeight() - (DRAWING_PDF_MARGIN - minY) * scale };
  return { page, placement: { origin, scale } };
}

function drawElement(page: PDFPage, element: DrawingElement, placement: Placement, font: PDFFont) {
  const color = buildPdfColor(COLORS[element.color]);
  if (element.kind === "text") {
    drawText(page, element, placement, font, color);
    return;
  }
  // O caminho fica nas coordenadas do editor, com y para baixo, e a pdf-lib converte a partir da origem
  page.drawSvgPath(buildElementPath(element), {
    x: placement.origin.x,
    y: placement.origin.y,
    scale: placement.scale,
    borderColor: color,
    borderWidth: element.strokeWidth * placement.scale,
    borderLineCap: LineCapStyle.Round,
  });
}

function buildElementPath(element: Exclude<DrawingElement, { kind: "text" }>) {
  switch (element.kind) {
    case "pen":
      return buildPenPath(element.points);
    case "line":
      return `M ${element.start.x} ${element.start.y} L ${element.end.x} ${element.end.y}`;
    case "arrow": {
      const { start, end } = element;
      const { left, right } = buildArrowHead(start, end, element.strokeWidth);
      return `M ${start.x} ${start.y} L ${end.x} ${end.y} M ${left.x} ${left.y} L ${end.x} ${end.y} L ${right.x} ${right.y}`;
    }
    case "rectangle":
      return buildRoundedRectanglePath(element);
    case "ellipse": {
      const radiusX = element.width / 2;
      const radiusY = element.height / 2;
      const centerY = element.y + radiusY;
      return `M ${element.x} ${centerY} A ${radiusX} ${radiusY} 0 1 0 ${element.x + element.width} ${centerY} A ${radiusX} ${radiusY} 0 1 0 ${element.x} ${centerY} Z`;
    }
  }
}

// Retângulo com o canto arredondado do editor; o raio encolhe no retângulo estreito
function buildRoundedRectanglePath({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const radius = Math.min(RECTANGLE_RADIUS, width / 2, height / 2);
  if (radius === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  const arc = `A ${radius} ${radius} 0 0 1`;
  return [
    `M ${x + radius} ${y}`,
    `H ${x + width - radius} ${arc} ${x + width} ${y + radius}`,
    `V ${y + height - radius} ${arc} ${x + width - radius} ${y + height}`,
    `H ${x + radius} ${arc} ${x} ${y + height - radius}`,
    `V ${y + radius} ${arc} ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

// Cada linha na mesma altura do editor: a primeira desce um tamanho de fonte, as outras uma altura de linha
function drawText(
  page: PDFPage,
  element: Extract<DrawingElement, { kind: "text" }>,
  { origin, scale }: Placement,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  const supported = new Set(font.getCharacterSet());
  element.text.split("\n").forEach((line, index) => {
    const baseline = element.y + element.fontSize + index * element.fontSize * LINE_HEIGHT_RATIO;
    page.drawText(buildSupportedText(line, supported), {
      x: origin.x + element.x * scale,
      y: origin.y - baseline * scale,
      size: element.fontSize * scale,
      font,
      color,
    });
  });
}

// A fonte padrão do PDF não tem emoji nem todo símbolo, e a pdf-lib falha no caractere que falta
function buildSupportedText(text: string, supported: Set<number>) {
  return Array.from(text, (char) => (supported.has(char.codePointAt(0) ?? 0) ? char : MISSING_CHARACTER)).join("");
}

function buildPdfColor(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return rgb(((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255);
}
