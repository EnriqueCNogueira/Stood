import { z } from "zod";
import {
  DEFAULT_FOCUS_MINUTES,
  DEFAULT_PAUSE_MINUTES,
  MAX_FOCUS_MINUTES,
  MAX_PAUSE_MINUTES,
  MIN_FOCUS_MINUTES,
  MIN_PAUSE_MINUTES,
} from "@/lib/pomodoro/limits";

// Durações, som e Pausa do Pomodoro, guardados no localStorage do navegador e válidos para todos os Stoods

export const POMODORO_PREFERENCES_STORAGE_KEY = "stood-pomodoro-preferences";
export const POMODORO_PAUSE_STORAGE_KEY = "stood-pomodoro-pause";

// version muda quando o formato salvo mudar, para o valor antigo voltar ao padrão
const PREFERENCES_VERSION = 1;

const pomodoroPreferencesSchema = z.object({
  version: z.literal(PREFERENCES_VERSION),
  focusMinutes: z.number().int().min(MIN_FOCUS_MINUTES).max(MAX_FOCUS_MINUTES).catch(DEFAULT_FOCUS_MINUTES),
  pauseMinutes: z.number().int().min(MIN_PAUSE_MINUTES).max(MAX_PAUSE_MINUTES).catch(DEFAULT_PAUSE_MINUTES),
  isSoundOn: z.boolean().catch(true),
});

const pomodoroPauseSchema = z.object({ endsAt: z.iso.datetime() });

export type PomodoroPreferences = z.infer<typeof pomodoroPreferencesSchema>;

export const DEFAULT_POMODORO_PREFERENCES: PomodoroPreferences = pomodoroPreferencesSchema.parse({
  version: PREFERENCES_VERSION,
});

// Valor ausente, ilegível ou de outra versão volta inteiro ao padrão; opção inválida volta sozinha
export function parsePomodoroPreferences(stored: string | null): PomodoroPreferences {
  if (stored === null) return DEFAULT_POMODORO_PREFERENCES;
  try {
    const parsed = pomodoroPreferencesSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : DEFAULT_POMODORO_PREFERENCES;
  } catch {
    return DEFAULT_POMODORO_PREFERENCES;
  }
}

// Fim da Pausa em andamento; a que já terminou ou está ilegível não existe mais
export function parsePomodoroPause(stored: string | null, now: Date): Date | undefined {
  if (!stored) return undefined;
  try {
    const parsed = pomodoroPauseSchema.safeParse(JSON.parse(stored));
    if (!parsed.success) return undefined;
    const endsAt = new Date(parsed.data.endsAt);
    return endsAt > now ? endsAt : undefined;
  } catch {
    return undefined;
  }
}
