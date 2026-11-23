import { FileText, Image, PenTool, SquarePlay } from "lucide-react";
import type { FileType } from "@/lib/stood/tree";

// Ordem em que os tipos aparecem na tela
export const FILE_TYPE_ORDER: FileType[] = ["note", "drawing", "video", "image"];

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  note: "Nota",
  drawing: "Desenho",
  video: "Vídeo",
  image: "Imagem",
};

const ICONS = { note: FileText, drawing: PenTool, video: SquarePlay, image: Image };

const COLORS: Record<FileType, string> = {
  note: "text-type-note",
  drawing: "text-type-drawing",
  video: "text-type-video",
  image: "text-type-image",
};

export function FileTypeIcon({ type, size = 16, className = "" }: { type: FileType; size?: number; className?: string }) {
  const Icon = ICONS[type];
  return <Icon size={size} strokeWidth={1.75} aria-hidden className={`flex-none ${COLORS[type]} ${className}`} />;
}
