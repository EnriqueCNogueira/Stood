import { z } from "zod";

// Opções da engrenagem e da barra lateral, guardadas no localStorage do navegador e válidas para todos os Stoods

export const BOARD_PREFERENCES_STORAGE_KEY = "stood-board-preferences";
export const BOARD_SIDEBAR_COLLAPSED_STORAGE_KEY = "stood-board-sidebar-collapsed";
export const SIDEBAR_WIDTH_STORAGE_KEYS = {
  library: "stood-sidebar-width-library",
  board: "stood-sidebar-width-board",
} as const;

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 480;

export const BOARD_BACKGROUNDS = ["clean", "grid", "dots"] as const;
export const BOARD_SPACINGS = ["small", "medium", "large"] as const;
export const BOARD_THEMES = ["site", "light", "dark"] as const;

export type BoardBackground = (typeof BOARD_BACKGROUNDS)[number];
export type BoardSpacing = (typeof BOARD_SPACINGS)[number];
export type BoardTheme = (typeof BOARD_THEMES)[number];

export const SPACING_PIXELS: Record<BoardSpacing, number> = { small: 16, medium: 24, large: 32 };

// version muda quando o formato salvo mudar, para o valor antigo voltar ao padrão
const PREFERENCES_VERSION = 1;

// Padrões: pontos, médio, encaixe desligado e Seguir o site
const boardPreferencesSchema = z.object({
  version: z.literal(PREFERENCES_VERSION),
  background: z.enum(BOARD_BACKGROUNDS).catch("dots"),
  spacing: z.enum(BOARD_SPACINGS).catch("medium"),
  snapToGrid: z.boolean().catch(false),
  theme: z.enum(BOARD_THEMES).catch("site"),
});

export type BoardPreferences = z.infer<typeof boardPreferencesSchema>;

export const DEFAULT_BOARD_PREFERENCES: BoardPreferences = boardPreferencesSchema.parse({ version: PREFERENCES_VERSION });

// Valor ausente, ilegível ou de outra versão volta inteiro ao padrão; opção inválida volta sozinha
export function parseBoardPreferences(stored: string | null): BoardPreferences {
  if (stored === null) return DEFAULT_BOARD_PREFERENCES;
  try {
    const parsed = boardPreferencesSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : DEFAULT_BOARD_PREFERENCES;
  } catch {
    return DEFAULT_BOARD_PREFERENCES;
  }
}

// Espaçamento do encaixe em pixels, ou nulo quando o encaixe está desligado ou o fundo é limpo
export function buildBoardSnap(preferences: BoardPreferences): number | null {
  if (!preferences.snapToGrid || preferences.background === "clean") return null;
  return SPACING_PIXELS[preferences.spacing];
}

export function parseSidebarWidth(stored: string | null, fallback: number): number {
  const width = Number(stored);
  if (stored === null || stored.trim() === "" || !Number.isFinite(width)) return fallback;
  return buildSidebarWidth(width);
}

export function buildSidebarWidth(width: number) {
  return Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}
