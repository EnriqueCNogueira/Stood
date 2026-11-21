"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";
import { deleteWeeklyGoalAction, upsertWeeklyGoalAction } from "@/app/_components/workspace/pomodoro-actions";
import { MAX_WEEKLY_GOAL_MINUTES, MIN_WEEKLY_GOAL_MINUTES, isValidWeeklyGoalMinutes } from "@/lib/pomodoro/limits";

const MINUTES_PER_HOUR = 60;
const MIN_GOAL_HOURS = MIN_WEEKLY_GOAL_MINUTES / MINUTES_PER_HOUR;
const MAX_GOAL_HOURS = MAX_WEEKLY_GOAL_MINUTES / MINUTES_PER_HOUR;
const INVALID_GOAL_MESSAGE = `A Meta semanal vai de ${String(MIN_GOAL_HOURS).replace(".", ",")} a ${MAX_GOAL_HOURS} horas, de meia em meia hora.`;
const UNEXPECTED_MESSAGE = "Não foi possível salvar a Meta semanal. Tente de novo.";

// Definir, mudar ou remover a Meta semanal, em horas na tela e em minutos no Service
export function WeeklyGoalForm({ goalMinutes }: { goalMinutes: number | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldId = useId();
  const errorId = useId();

  function startEditing() {
    setDraft(goalMinutes === null ? "" : String(goalMinutes / MINUTES_PER_HOUR));
    setError(null);
    setIsEditing(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = Math.round(Number(draft.replace(",", ".")) * MINUTES_PER_HOUR);
    if (draft.trim() === "" || !isValidWeeklyGoalMinutes(minutes)) {
      setError(INVALID_GOAL_MESSAGE);
      return;
    }
    startTransition(async () => {
      try {
        const result = await upsertWeeklyGoalAction({ minutes });
        if (!result.ok) {
          setError(INVALID_GOAL_MESSAGE);
          return;
        }
        setIsEditing(false);
      } catch {
        setError(UNEXPECTED_MESSAGE);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteWeeklyGoalAction();
        setIsEditing(false);
      } catch {
        setError(UNEXPECTED_MESSAGE);
      }
    });
  }

  if (!isEditing) {
    return (
      <button type="button" onClick={startEditing} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
        {goalMinutes === null ? "Definir Meta semanal" : "Mudar Meta semanal"}
      </button>
    );
  }

  return (
    <form onSubmit={save} noValidate className="grid w-full gap-3 sm:w-auto">
      <div className="flex flex-wrap items-end gap-2">
        <div className={FIELD}>
          <label htmlFor={fieldId} className={FIELD_LABEL}>
            Meta semanal, em horas
          </label>
          <input
            id={fieldId}
            type="text"
            inputMode="decimal"
            autoFocus
            value={draft}
            placeholder="10"
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            className={`${INPUT} w-28`}
          />
        </div>
        <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
          Salvar
        </button>
        <button type="button" onClick={() => setIsEditing(false)} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.ghost}`}>
          Cancelar
        </button>
        {goalMinutes !== null && (
          <button type="button" disabled={isPending} onClick={remove} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
            Remover meta
          </button>
        )}
      </div>
      {error && (
        <FormMessage tone="error" id={errorId}>
          {error}
        </FormMessage>
      )}
    </form>
  );
}
