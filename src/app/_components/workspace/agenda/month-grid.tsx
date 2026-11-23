import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { BUTTON, FOCUS, ICON_BUTTON } from "@/app/_components/ui";
import type { AgendaMonth } from "@/lib/agenda/agenda";
import { buildAgendaDayPath, buildMonthTitle, shiftMonth, sortDayItems } from "@/lib/agenda/rules";
import { buildStudiedTimeLabel } from "@/lib/pomodoro/time";

const WEEKDAY_HEADERS = [
  { short: "Dom", full: "Domingo" },
  { short: "Seg", full: "Segunda" },
  { short: "Ter", full: "Terça" },
  { short: "Qua", full: "Quarta" },
  { short: "Qui", full: "Quinta" },
  { short: "Sex", full: "Sexta" },
  { short: "Sáb", full: "Sábado" },
];
const TITLES_PER_CELL = 2;

type MonthGridProps = { agenda: AgendaMonth; today: string };

// Grade do mês, de domingo a sábado: cada dia é um link que escolhe o dia e mostra o detalhe ao lado
export function MonthGrid({ agenda, today }: MonthGridProps) {
  const itemsByDay = Map.groupBy(agenda.items, (item) => item.day);

  return (
    <section aria-labelledby="agenda-month" className="min-w-0 flex-1">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="agenda-month" className="mr-auto text-lg font-medium tracking-tight first-letter:uppercase">
          {buildMonthTitle(agenda.month)}
        </h2>
        <a href={`/agenda?dia=${today}`} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
          Hoje
        </a>
        <a href={`/agenda?mes=${shiftMonth(agenda.month, -1)}`} aria-label="Mês anterior" className={ICON_BUTTON}>
          <ChevronLeft size={16} aria-hidden />
        </a>
        <a href={`/agenda?mes=${shiftMonth(agenda.month, 1)}`} aria-label="Mês seguinte" className={ICON_BUTTON}>
          <ChevronRight size={16} aria-hidden />
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2">
          {WEEKDAY_HEADERS.map((weekday) => (
            <div key={weekday.short} className="px-1 py-1.5 text-center text-meta font-medium text-text-muted">
              <abbr title={weekday.full} className="no-underline">
                {weekday.short}
              </abbr>
            </div>
          ))}
        </div>

        {agenda.weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day) => (
              <DayCell
                key={day}
                day={day}
                isInMonth={day.startsWith(agenda.month)}
                isToday={day === today}
                isSelected={day === agenda.selectedDay}
                studiedSeconds={agenda.studiedSecondsByDay[day]}
                items={sortDayItems(itemsByDay.get(day) ?? [])}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

type DayCellProps = {
  day: string;
  isInMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  studiedSeconds: number | undefined;
  items: { title: string; isRecurring: boolean; originalDay: string; appointmentId: string }[];
};

// No computador, até 2 títulos e "+N"; no celular, só a quantidade de Compromissos
function DayCell({ day, isInMonth, isToday, isSelected, studiedSeconds, items }: DayCellProps) {
  const dayNumber = Number(day.slice(8, 10));
  const hiddenCount = items.length - TITLES_PER_CELL;

  return (
    <a
      href={buildAgendaDayPath(day)}
      aria-current={isSelected ? "date" : undefined}
      aria-label={buildCellLabel(day, studiedSeconds, items.length)}
      className={`flex min-h-16 min-w-0 flex-col gap-0.5 border-r border-border p-1 text-left transition last:border-r-0 hover:bg-surface-2 md:min-h-24 md:p-1.5 ${FOCUS} ${
        isSelected ? "bg-accent/12" : isInMonth ? "bg-surface" : "bg-bg"
      }`}
    >
      <span
        className={`grid size-6 place-items-center rounded-full text-meta ${
          isToday ? "bg-accent font-medium text-on-accent" : isInMonth ? "text-text" : "text-text-muted"
        }`}
      >
        {dayNumber}
      </span>
      {studiedSeconds !== undefined && (
        <span className="truncate font-mono text-meta text-text-muted">{buildStudiedTimeLabel(studiedSeconds)}</span>
      )}
      {items.length > 0 && (
        <>
          <span className="w-fit rounded-full bg-accent/12 px-1.5 text-meta text-accent-text md:hidden">{items.length}</span>
          <ul className="hidden min-w-0 gap-0.5 md:grid">
            {items.slice(0, TITLES_PER_CELL).map((item) => (
              <li key={`${item.appointmentId}:${item.originalDay}`} className="flex min-w-0 items-center gap-1 text-meta">
                {item.isRecurring && <Repeat size={10} aria-hidden className="flex-none text-text-muted" />}
                <span className="truncate">{item.title}</span>
              </li>
            ))}
            {hiddenCount > 0 && <li className="text-meta text-text-muted">+{hiddenCount}</li>}
          </ul>
        </>
      )}
    </a>
  );
}

// Leitor de tela: o dia, o Tempo estudado e quantos Compromissos ele tem, já que a célula mostra pouco texto
function buildCellLabel(day: string, studiedSeconds: number | undefined, count: number) {
  const parts = [day.split("-").reverse().join("/")];
  if (studiedSeconds !== undefined) parts.push(`${buildStudiedTimeLabel(studiedSeconds)} estudados`);
  if (count > 0) parts.push(count === 1 ? "1 Compromisso" : `${count} Compromissos`);
  return parts.join(", ");
}
