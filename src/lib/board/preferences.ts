// Largura da barra lateral, guardada no localStorage do navegador

export const SIDEBAR_WIDTH_STORAGE_KEYS = {
  library: "stood-sidebar-width-library",
} as const;

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 480;

export function parseSidebarWidth(stored: string | null, fallback: number): number {
  const width = Number(stored);
  if (stored === null || stored.trim() === "" || !Number.isFinite(width)) return fallback;
  return buildSidebarWidth(width);
}

export function buildSidebarWidth(width: number) {
  return Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}
