import { type Zippable, strToU8, zipSync } from "fflate";
import { buildJpeg } from "@/app/_components/jpeg";
import { buildImageUrl } from "@/lib/file/image";
import type { ExportEntry } from "@/lib/export/export";

// Montagem do .zip no navegador: lê o que o Quadro já tem e converte com as APIs do navegador
// O PDF e o JPEG já vêm comprimidos: comprimir de novo só gasta tempo
const STORED = { level: 0 } as const;
const REVOKE_DELAY_MS = 10_000;

// Cada Arquivo vira os bytes do seu formato; getContent devolve o texto atual da Nota e do Desenho, mesmo sem salvar
export async function buildStoodArchive(entries: ExportEntry[], getContent: (fileId: string) => string) {
  // A pdf-lib só carrega quando há Desenho a exportar, e não a cada abertura do Quadro
  const pdf = entries.some((entry) => entry.type === "drawing") ? await import("@/lib/drawing/pdf") : undefined;
  const files: Zippable = {};
  for (const entry of entries) {
    switch (entry.type) {
      case "note":
        files[entry.path] = strToU8(getContent(entry.fileId));
        break;
      case "drawing":
        files[entry.path] = [await pdf!.buildDrawingPdf(getContent(entry.fileId)), STORED];
        break;
      case "image":
        files[entry.path] = [await fetchJpegImage(entry.fileId), STORED];
        break;
    }
  }
  return zipSync(files);
}

export function downloadFile(bytes: Uint8Array<ArrayBuffer>, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revogar na hora pode cancelar o download em alguns navegadores, que ainda leem a URL depois do clique
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

// A Imagem em JPEG sai como foi enviada; PNG e WebP são redesenhados num canvas e salvos em JPEG
async function fetchJpegImage(fileId: string) {
  const response = await fetch(buildImageUrl(fileId));
  if (!response.ok) throw new Error(`image fetch failed: ${response.status}`);
  const blob = await response.blob();
  if (blob.type === "image/jpeg") return new Uint8Array(await blob.arrayBuffer());

  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  const jpeg = await buildJpeg(bitmap, { x: 0, y: 0, ...size }, size);
  bitmap.close();
  return new Uint8Array(await jpeg.arrayBuffer());
}
