const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

// Primeira palavra do nome do Usuário, para a saudação da Biblioteca
export function buildFirstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

// Há quanto tempo, contado pelas horas passadas e não pelo dia do calendário, porque o servidor roda em UTC
export function buildRelativeTime(date: Date, now: Date) {
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  const days = Math.floor(elapsed / MS_PER_DAY);

  if (elapsed < MS_PER_MINUTE) return RELATIVE_TIME_FORMAT.format(0, "second");
  if (elapsed < MS_PER_HOUR) return RELATIVE_TIME_FORMAT.format(-Math.floor(elapsed / MS_PER_MINUTE), "minute");
  if (days < 1) return RELATIVE_TIME_FORMAT.format(-Math.floor(elapsed / MS_PER_HOUR), "hour");
  if (days < DAYS_PER_WEEK) return RELATIVE_TIME_FORMAT.format(-days, "day");
  if (days < DAYS_PER_MONTH) return RELATIVE_TIME_FORMAT.format(-Math.floor(days / DAYS_PER_WEEK), "week");
  if (days < DAYS_PER_YEAR) return RELATIVE_TIME_FORMAT.format(-Math.floor(days / DAYS_PER_MONTH), "month");
  return RELATIVE_TIME_FORMAT.format(-Math.floor(days / DAYS_PER_YEAR), "year");
}
