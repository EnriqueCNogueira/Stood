import { Plus, Repeat } from "lucide-react";
import { BUTTON, CARD, FOCUS } from "@/app/_components/ui";
import { AppointmentDialog } from "@/app/_components/workspace/agenda/appointment-dialog";
import type { AgendaMonth } from "@/lib/agenda/agenda";
import { buildDayTitle, buildSortedDayItems } from "@/lib/agenda/rules";
import { buildStudiedTimeLabel } from "@/lib/pomodoro/time";

// Detalhe do dia escolhido: Tempo estudado por Stood, Compromissos do dia em ordem e "Novo Compromisso" já com esse dia
export function DayDetail({ agenda }: { agenda: AgendaMonth }) {
  const items = buildSortedDayItems(agenda.items.filter((item) => item.day === agenda.selectedDay));
  const studiedSeconds = agenda.studiedSecondsByDay[agenda.selectedDay];

  return (
    <aside aria-labelledby="agenda-day" className={`${CARD} grid content-start gap-5 bg-surface p-4 lg:w-80 lg:flex-none`}>
      <h2 id="agenda-day" className="text-base font-medium first-letter:uppercase">
        {buildDayTitle(agenda.selectedDay)}
      </h2>

      <section aria-labelledby="agenda-day-studied" className="grid gap-2">
        <h3 id="agenda-day-studied" className="text-ui text-text-muted">
          Tempo estudado: <span className="font-medium text-text">{buildStudiedTimeLabel(studiedSeconds ?? 0)}</span>
        </h3>
        {agenda.selectedDayStoods.length > 0 && (
          <ul aria-label="Tempo estudado por Stood" className="grid gap-1">
            {agenda.selectedDayStoods.map((stood) => (
              <li key={stood.id} className="flex items-center justify-between gap-3 text-ui">
                <a href={`/stood/${stood.id}`} className={`min-w-0 truncate rounded-sm hover:underline ${FOCUS}`}>
                  {stood.name}
                </a>
                <span className="flex-none font-mono text-meta text-text-muted">{buildStudiedTimeLabel(stood.studiedSeconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="agenda-day-appointments" className="grid gap-2">
        <h3 id="agenda-day-appointments" className="text-ui text-text-muted">
          Compromissos
        </h3>
        {items.length > 0 ? (
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={`${item.appointmentId}:${item.originalDay}`}>
                <AppointmentDialog
                  mode="edit"
                  entry={item}
                  stoods={agenda.stoods}
                  triggerClassName={`flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-ui hover:bg-surface-2 ${FOCUS}`}
                >
                  <span className="w-16 flex-none font-mono text-meta text-text-muted">{item.timeOfDay ?? "Dia todo"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      {item.isRecurring && <Repeat size={12} aria-label="Repete" className="flex-none text-text-muted" />}
                      <span className="truncate">{item.title}</span>
                    </span>
                    {item.stoodName && <span className="block truncate text-meta text-text-muted">{item.stoodName}</span>}
                  </span>
                </AppointmentDialog>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui text-text-muted">Nenhum Compromisso neste dia.</p>
        )}
        <AppointmentDialog
          mode="create"
          day={agenda.selectedDay}
          stoods={agenda.stoods}
          triggerClassName={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary} mt-1`}
        >
          <Plus size={16} aria-hidden />
          Novo Compromisso
        </AppointmentDialog>
      </section>
    </aside>
  );
}
