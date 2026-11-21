// Limites do Pomodoro, usados pelo Service, pelas preferências do navegador e pelas CHECK do schema.
// Sem import com @/, porque o schema importa este arquivo direto no Node.

export const MIN_FOCUS_MINUTES = 5;
export const MAX_FOCUS_MINUTES = 120;
export const DEFAULT_FOCUS_MINUTES = 25;

export const MIN_PAUSE_MINUTES = 1;
export const MAX_PAUSE_MINUTES = 60;
export const DEFAULT_PAUSE_MINUTES = 5;

// Foco interrompido antes disso é descartado e não conta como Tempo estudado
export const MIN_COUNTED_FOCUS_SECONDS = 60;

export const MIN_WEEKLY_GOAL_MINUTES = 30;
export const MAX_WEEKLY_GOAL_MINUTES = 80 * 60;
export const WEEKLY_GOAL_STEP_MINUTES = 30;

// A semana vai de segunda a domingo no horário de Brasília, para todos os Usuários
export const WEEK_TIME_ZONE = "America/Sao_Paulo";

export function isValidFocusMinutes(minutes: number) {
  return Number.isInteger(minutes) && minutes >= MIN_FOCUS_MINUTES && minutes <= MAX_FOCUS_MINUTES;
}

export function isValidPauseMinutes(minutes: number) {
  return Number.isInteger(minutes) && minutes >= MIN_PAUSE_MINUTES && minutes <= MAX_PAUSE_MINUTES;
}

export function isValidWeeklyGoalMinutes(minutes: number) {
  const isInRange = minutes >= MIN_WEEKLY_GOAL_MINUTES && minutes <= MAX_WEEKLY_GOAL_MINUTES;
  return Number.isInteger(minutes) && isInRange && minutes % WEEKLY_GOAL_STEP_MINUTES === 0;
}
