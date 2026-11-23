import { Repeat } from "lucide-react";
import { CARD, FOCUS, TEXT_LINK } from "@/app/_components/ui";
import type { AgendaEntry } from "@/lib/agenda/agenda";
import { buildAgendaDayPath, buildRelativeDayLabel } from "@/lib/agenda/rules";

// Lembrete da Biblioteca: os próximos Compromissos, com destaque para hoje e amanhã, e cada linha leva ao dia dele na Agenda;
// sem nenhum, a seção não aparece
export function UpcomingAppointments({ items, today }: { items: AgendaEntry[]; today: string }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="upcoming-appointments" className="mb-10">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 id="upcoming-appointments" className="text-base font-medium">
          Próximos compromissos
        </h2>
        <a href="/agenda" className={TEXT_LINK}>
          Ver Agenda
        </a>
      </div>

      <ul className={`${CARD} grid divide-y divide-border bg-surface`}>
        {items.map((item) => {
          const label = buildRelativeDayLabel(item.day, today);
          const isSoon = label === "hoje" || label === "amanhã";
          return (
            <li key={`${item.appointmentId}:${item.originalDay}`} className="first:*:rounded-t-lg last:*:rounded-b-lg">
              <a href={buildAgendaDayPath(item.day)} className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${FOCUS}`}>
                <span
                  className={`w-24 flex-none rounded-full px-2 py-0.5 text-center text-meta font-medium ${
                    isSoon ? "bg-accent text-on-accent" : "bg-surface-2 text-text-muted group-hover:bg-surface"
                  }`}
                >
                  {label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-ui">
                    {item.isRecurring && <Repeat size={12} aria-label="Repete" className="flex-none text-text-muted" />}
                    <span className="truncate">{item.title}</span>
                  </span>
                  {item.stoodName && <span className="block truncate text-meta text-text-muted">{item.stoodName}</span>}
                </span>
                {item.timeOfDay && <span className="flex-none font-mono text-meta text-text-muted">{item.timeOfDay}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
