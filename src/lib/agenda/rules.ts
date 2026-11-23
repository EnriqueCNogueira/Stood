// Regras da Agenda sem I/O: Ocorrências dos Compromissos, ordem do dia, próximos Compromissos e grade do mês.
// O Service, o client e as CHECK do schema usam este arquivo. Sem import com @/, porque o schema importa
// este arquivo direto no Node. Os dias são texto "AAAA-MM-DD" no horário de Brasília.

export const MAX_APPOINTMENT_TITLE_LENGTH = 100;
export const MAX_APPOINTMENTS_PER_USER = 500;
export const UPCOMING_DAYS = 14;
export const UPCOMING_LIMIT = 3;
export const RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;
export const AGENDA_TIME_ZONE = "America/Sao_Paulo";

export type Recurrence = (typeof RECURRENCES)[number];

// Compromisso como guardado: a regra de repetição, sem as Ocorrências
export type AppointmentRule = {
  id: string;
  title: string;
  day: string;
  timeOfDay: string | null;
  stoodId: string | null;
  recurrence: Recurrence;
  weekdays: number[];
  endsOn: string | null;
};

// Ocorrência mudada ou apagada à mão; mudada, ela traz todos os dados que valem para ela
export type OccurrenceChange = {
  appointmentId: string;
  originalDay: string;
  isDeleted: boolean;
  title: string | null;
  day: string | null;
  timeOfDay: string | null;
  stoodId: string | null;
};

// Compromisso ou Ocorrência num dia da Agenda
export type AgendaItem = {
  appointmentId: string;
  originalDay: string;
  day: string;
  title: string;
  timeOfDay: string | null;
  stoodId: string | null;
  isRecurring: boolean;
  hasChanges: boolean;
};

type AppointmentInput = {
  title: string;
  day: string;
  timeOfDay: string | null;
  recurrence: Recurrence;
  weekdays: number[];
  endsOn: string | null;
};

type OccurrenceInput = { title: string; day: string; timeOfDay: string | null };

export type AppointmentInputReason =
  | "titulo-vazio"
  | "titulo-longo"
  | "dia-invalido"
  | "horario-invalido"
  | "dias-da-semana-invalidos"
  | "data-final-antes-do-inicio";

type ValidateAppointmentInputResult = { ok: true; input: AppointmentInput } | { ok: false; reason: AppointmentInputReason };
type ValidateOccurrenceInputResult =
  | { ok: true; input: OccurrenceInput }
  | { ok: false; reason: Extract<AppointmentInputReason, "titulo-vazio" | "titulo-longo" | "dia-invalido" | "horario-invalido"> };

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TITLE_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
// Os dias viram datas à meia-noite em UTC, então os textos usam UTC para não voltar um dia
const MONTH_TITLE_FORMAT = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
const DAY_TITLE_FORMAT = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const BRASILIA_DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: AGENDA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Dias em que a regra cria uma Ocorrência, dentro de [from, to] e sem passar da data final
export function buildOccurrenceDays(rule: AppointmentRule, from: string, to: string): string[] {
  if (rule.recurrence === "none") return rule.day >= from && rule.day <= to ? [rule.day] : [];

  const start = rule.day > from ? rule.day : from;
  const end = rule.endsOn !== null && rule.endsOn < to ? rule.endsOn : to;
  if (start > end) return [];
  if (rule.recurrence === "monthly") return buildMonthlyDays(rule.day, start, end);

  const weekdays = new Set(rule.weekdays);
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    if (rule.recurrence === "daily" || weekdays.has(buildWeekday(day))) days.push(day);
  }
  return days;
}

// Compromissos e Ocorrências de [from, to], já com as mudanças feitas à mão, em ordem de dia
export function buildAgendaItems(rules: AppointmentRule[], changes: OccurrenceChange[], from: string, to: string): AgendaItem[] {
  const changesByAppointment = Map.groupBy(changes, (change) => change.appointmentId);
  const items = rules.flatMap((rule) => {
    const ruleChanges = changesByAppointment.get(rule.id) ?? [];
    const changedDays = new Set(ruleChanges.map((change) => change.originalDay));
    const base = {
      appointmentId: rule.id,
      isRecurring: rule.recurrence !== "none",
      hasChanges: ruleChanges.length > 0,
    };
    const generated = buildOccurrenceDays(rule, from, to)
      .filter((day) => !changedDays.has(day))
      .map((day) => ({ ...base, originalDay: day, day, title: rule.title, timeOfDay: rule.timeOfDay, stoodId: rule.stoodId }));
    // A Ocorrência mudada aparece no novo dia, mesmo depois da data final ou fora do intervalo original
    const moved = ruleChanges
      .filter((change) => !change.isDeleted && change.day !== null && change.day >= from && change.day <= to)
      .map((change) => ({
        ...base,
        originalDay: change.originalDay,
        day: change.day as string,
        title: change.title ?? rule.title,
        timeOfDay: change.timeOfDay,
        stoodId: change.stoodId,
      }));
    return [...generated, ...moved];
  });
  return items.sort((a, b) => a.day.localeCompare(b.day) || compareDayOrder(a, b));
}

// Ordem de um dia: primeiro o dia inteiro, depois por horário, e o empate por título
export function sortDayItems<T extends { title: string; timeOfDay: string | null }>(items: T[]): T[] {
  return [...items].sort(compareDayOrder);
}

// Lembrete da Biblioteca: até 3 dos próximos 14 dias, contando hoje inteiro, e o recorrente uma vez só
export function buildUpcomingItems(rules: AppointmentRule[], changes: OccurrenceChange[], today: string): AgendaItem[] {
  const items = buildAgendaItems(rules, changes, today, addDays(today, UPCOMING_DAYS - 1));
  const seen = new Set<string>();
  const upcoming = items.filter((item) => {
    if (seen.has(item.appointmentId)) return false;
    seen.add(item.appointmentId);
    return true;
  });
  return upcoming.slice(0, UPCOMING_LIMIT);
}

export function buildAgendaDayPath(day: string) {
  return `/agenda?mes=${day.slice(0, 7)}&dia=${day}`;
}

export function buildRelativeDayLabel(day: string, today: string) {
  const days = Math.round((parseDay(day) - parseDay(today)) / MS_PER_DAY);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function buildTodayInBrasilia(now: Date) {
  return BRASILIA_DAY_FORMAT.format(now);
}

// Semanas do mês, de domingo a sábado, com os dias dos meses vizinhos completando a primeira e a última
export function buildMonthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const gridStart = addDays(first, -buildWeekday(first));
  const gridEnd = addDays(last, DAYS_PER_WEEK - 1 - buildWeekday(last));
  const weeks: string[][] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, DAYS_PER_WEEK)) {
    weeks.push(Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(day, index)));
  }
  return weeks;
}

// "novembro de 2026", para o cabeçalho da grade
export function buildMonthTitle(month: string) {
  return MONTH_TITLE_FORMAT.format(new Date(parseDay(`${month}-01`)));
}

// "segunda-feira, 23 de novembro", para o detalhe do dia
export function buildDayTitle(day: string) {
  return DAY_TITLE_FORMAT.format(new Date(parseDay(day)));
}

export function shiftMonth(month: string, delta: number) {
  const [, year, monthNumber] = MONTH_PATTERN.exec(month) ?? [];
  const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export function addDays(day: string, amount: number) {
  return new Date(parseDay(day) + amount * MS_PER_DAY).toISOString().slice(0, 10);
}

export function isValidDay(day: string) {
  const match = DAY_PATTERN.exec(day);
  if (!match) return false;
  return new Date(parseDay(day)).toISOString().slice(0, 10) === day;
}

export function isValidMonth(month: string) {
  return MONTH_PATTERN.test(month) && isValidDay(`${month}-01`);
}

// Regras do diálogo do Compromisso; o que não vale para a repetição escolhida é descartado
export function validateAppointmentInput(input: AppointmentInput): ValidateAppointmentInputResult {
  const occurrence = validateOccurrenceInput(input);
  if (!occurrence.ok) return occurrence;

  const isWeekly = input.recurrence === "weekly";
  const weekdays = isWeekly ? [...new Set(input.weekdays)].sort((a, b) => a - b) : [];
  const hasValidWeekdays = weekdays.every((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday < DAYS_PER_WEEK);
  if (isWeekly && (weekdays.length === 0 || !hasValidWeekdays)) return { ok: false, reason: "dias-da-semana-invalidos" };

  const endsOn = input.recurrence === "none" || !input.endsOn ? null : input.endsOn;
  if (endsOn !== null && !isValidDay(endsOn)) return { ok: false, reason: "dia-invalido" };
  if (endsOn !== null && endsOn < occurrence.input.day) return { ok: false, reason: "data-final-antes-do-inicio" };

  return { ok: true, input: { ...occurrence.input, recurrence: input.recurrence, weekdays, endsOn } };
}

// Regras de "Só esta": título, dia e horário de uma Ocorrência
export function validateOccurrenceInput(input: { title: string; day: string; timeOfDay: string | null }): ValidateOccurrenceInputResult {
  const title = input.title.trim();
  if (title.length === 0) return { ok: false, reason: "titulo-vazio" };
  if (title.length > MAX_APPOINTMENT_TITLE_LENGTH) return { ok: false, reason: "titulo-longo" };
  if (!isValidDay(input.day)) return { ok: false, reason: "dia-invalido" };
  const timeOfDay = input.timeOfDay ? input.timeOfDay : null;
  if (timeOfDay !== null && !TIME_PATTERN.test(timeOfDay)) return { ok: false, reason: "horario-invalido" };
  return { ok: true, input: { title, day: input.day, timeOfDay } };
}

// Mensal: o mesmo número de dia em cada mês, ou o último dia nos meses mais curtos
function buildMonthlyDays(startDay: string, from: string, to: string): string[] {
  const dayOfMonth = Number(startDay.slice(8, 10));
  const days: string[] = [];
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = shiftMonth(month, 1)) {
    const lastDay = Number(addDays(`${shiftMonth(month, 1)}-01`, -1).slice(8, 10));
    const day = `${month}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
    if (day >= startDay && day >= from && day <= to) days.push(day);
  }
  return days;
}

function compareDayOrder(a: { title: string; timeOfDay: string | null }, b: { title: string; timeOfDay: string | null }) {
  if (a.timeOfDay !== b.timeOfDay) {
    if (a.timeOfDay === null) return -1;
    if (b.timeOfDay === null) return 1;
    return a.timeOfDay.localeCompare(b.timeOfDay);
  }
  return TITLE_COLLATOR.compare(a.title, b.title);
}

// 0 é domingo e 6 é sábado
function buildWeekday(day: string) {
  return new Date(parseDay(day)).getUTCDay();
}

function parseDay(day: string) {
  const [, year, month, date] = DAY_PATTERN.exec(day) ?? [];
  return Date.UTC(Number(year), Number(month) - 1, Number(date));
}
