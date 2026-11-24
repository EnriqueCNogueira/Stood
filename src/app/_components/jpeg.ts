const JPEG_QUALITY = 0.92;
// O JPEG não tem transparência; o fundo branco imita o papel, como no PDF do Desenho
const JPEG_BACKGROUND = "white";

type Size = { width: number; height: number };
type Area = Size & { x: number; y: number };

// Redesenha a área da imagem num canvas do tamanho pedido e devolve o JPEG
export async function buildJpeg(image: CanvasImageSource, area: Area, size: Size): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas 2d context unavailable");
  context.fillStyle = JPEG_BACKGROUND;
  context.fillRect(0, 0, size.width, size.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size.width, size.height);

  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!jpeg) throw new Error("jpeg encoding failed");
  return jpeg;
}
