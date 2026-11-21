// Formatação do tempo do Pomodoro na tela: contagem regressiva, Tempo estudado e progresso da Meta semanal

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const PERCENT = 100;

// Tempo restante como "mm:ss", arredondado para cima para não mostrar 00:00 antes do fim
export function buildCountdownLabel(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Tempo estudado como "2 h 15 min", sem os segundos
export function buildStudiedTimeLabel(seconds: number) {
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function buildGoalProgress(studiedSeconds: number, goalMinutes: number) {
  const percent = Math.floor((studiedSeconds / (goalMinutes * SECONDS_PER_MINUTE)) * PERCENT);
  return Math.min(percent, PERCENT);
}
