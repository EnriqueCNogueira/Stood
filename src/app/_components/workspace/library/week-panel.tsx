import { CARD, FOCUS } from "@/app/_components/ui";
import { ActiveFocusNotice } from "@/app/_components/workspace/library/active-focus-notice";
import { WeeklyGoalForm } from "@/app/_components/workspace/library/weekly-goal-form";
import type { WeekSummary } from "@/lib/pomodoro/pomodoro";
import { buildGoalProgress, buildStudiedTimeLabel } from "@/lib/pomodoro/time";

const SECONDS_PER_MINUTE = 60;

// Painel da semana na Biblioteca: Tempo estudado, Meta semanal, tempo por Stood e o Foco em andamento
export function WeekPanel({ summary, serverNow }: { summary: WeekSummary; serverNow: number }) {
  const { studiedSeconds, stoods, weeklyGoalMinutes, activeFocus } = summary;
  const progress = weeklyGoalMinutes === null ? null : buildGoalProgress(studiedSeconds, weeklyGoalMinutes);
  const studiedLabel = buildStudiedTimeLabel(studiedSeconds);

  return (
    <section aria-labelledby="week-panel" className="mb-10">
      <h2 id="week-panel" className="mb-3.5 text-base font-medium">
        Sua semana
      </h2>

      <div className={`${CARD} grid gap-4 bg-surface p-4 md:p-5`}>
        {activeFocus && (
          <ActiveFocusNotice stoodName={activeFocus.stoodName} endsAt={activeFocus.endsAt} serverNow={serverNow} />
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-ui text-text-muted">Tempo estudado de segunda a domingo</p>
            <p className="text-2xl font-medium tracking-tight">
              {studiedLabel}
              {weeklyGoalMinutes !== null && (
                <span className="text-base font-normal text-text-muted">
                  {" "}
                  de {buildStudiedTimeLabel(weeklyGoalMinutes * SECONDS_PER_MINUTE)}
                </span>
              )}
            </p>
          </div>
          <WeeklyGoalForm goalMinutes={weeklyGoalMinutes} />
        </div>

        {progress !== null && (
          <div
            role="progressbar"
            aria-label="Progresso da Meta semanal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress}% da Meta semanal`}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        )}

        {stoods.length > 0 ? (
          <ul aria-label="Tempo estudado por Stood" className="grid gap-1.5">
            {stoods.map((stood) => (
              <li key={stood.id} className="flex items-center justify-between gap-3 text-ui">
                <a href={`/stood/${stood.id}`} className={`min-w-0 truncate rounded-sm hover:underline ${FOCUS}`}>
                  {stood.name}
                </a>
                <span className="flex-none font-mono text-meta text-text-muted">{buildStudiedTimeLabel(stood.studiedSeconds)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui text-text-muted">
            Nenhum Foco encerrado nesta semana. Inicie um Foco na barra do Quadro de um Stood.
          </p>
        )}
      </div>
    </section>
  );
}
