"use client";

import { X } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, DIALOG, FIELD, FIELD_LABEL, FOCUS, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import {
  type CreateAppointmentActionResult,
  type DeleteAppointmentActionResult,
  type UpdateAppointmentActionResult,
  createAppointmentAction,
  deleteAppointmentAction,
  updateAppointmentAction,
} from "@/app/_components/workspace/agenda/appointment-actions";
import type { AppointmentSeries } from "@/lib/agenda/agenda";
import {
  MAX_APPOINTMENTS_PER_USER,
  MAX_APPOINTMENT_TITLE_LENGTH,
  type Recurrence,
  buildDayTitle,
  buildSeriesInput,
  isSameRecurrence,
  validateAppointmentInput,
  validateOccurrenceEdit,
} from "@/lib/agenda/rules";

type DialogReason =
  | Extract<CreateAppointmentActionResult | UpdateAppointmentActionResult | DeleteAppointmentActionResult, { ok: false }>["reason"]
  | "inesperado";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

// Toda recusa possível do diálogo tem mensagem: um reason novo sem texto não compila
const REASON_MESSAGES: Record<DialogReason, string> = {
  "titulo-vazio": "Dê um título ao Compromisso.",
  "titulo-longo": `O título pode ter até ${MAX_APPOINTMENT_TITLE_LENGTH} caracteres.`,
  "dia-invalido": "Escolha um dia válido.",
  "horario-invalido": "Escolha um horário válido.",
  "dias-da-semana-invalidos": "Escolha pelo menos um dia da semana.",
  "data-final-antes-do-inicio": "A data final não pode ser antes do dia de início.",
  "stood-nao-encontrado": "Este Stood não existe mais.",
  "limite-de-compromissos": `Você chegou ao limite de ${MAX_APPOINTMENTS_PER_USER} Compromissos.`,
  "compromisso-nao-encontrado": "Este Compromisso não existe mais.",
  "ocorrencia-nao-encontrada": "Esta Ocorrência não existe mais.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Não se repete",
  daily: "Todo dia",
  weekly: "Toda semana",
  monthly: "Todo mês",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// O que o diálogo precisa de um Compromisso ou Ocorrência para editar
export type EditableEntry = {
  appointmentId: string;
  originalDay: string;
  day: string;
  title: string;
  timeOfDay: string | null;
  stoodId: string | null;
  isRecurring: boolean;
  hasChanges: boolean;
  series: AppointmentSeries;
};

type FormValues = {
  title: string;
  day: string;
  timeOfDay: string;
  stoodId: string;
  recurrence: Recurrence;
  weekdays: number[];
  endsOn: string;
};

// Passo do diálogo: o formulário, a escolha entre "Só esta" e "Todas" ao salvar, ou a confirmação de apagar
type Step = "form" | "save-scope" | "delete";

type AppointmentDialogProps = {
  stoods: { id: string; name: string }[];
  triggerClassName: string;
  triggerLabel?: string;
  children: ReactNode;
} & ({ mode: "create"; day: string } | { mode: "edit"; entry: EditableEntry });

// Diálogo do Compromisso: cria com o dia escolhido ou edita; na Ocorrência de um recorrente, pergunta "Só esta" ou "Todas"
export function AppointmentDialog(props: AppointmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(props));
  const [step, setStep] = useState<Step>("form");
  const [reason, setReason] = useState<DialogReason | null>(null);
  const [isPending, startTransition] = useTransition();
  const entry = props.mode === "edit" ? props.entry : null;
  const series = entry?.series ?? null;
  const isRecurrenceChanged = series !== null && !isSameRecurrence(values, series);
  const isSeriesRuleChanged = isRecurrenceChanged || (series !== null && (values.endsOn || null) !== series.endsOn);

  function open() {
    setValues(buildInitialValues(props));
    setStep("form");
    setReason(null);
    dialogRef.current?.showModal();
    // Sem isto, o foco cai no "Fechar", o primeiro botão do diálogo, e Enter fecha em vez de escrever o título
    titleRef.current?.focus();
  }

  function close() {
    dialogRef.current?.close();
  }

  function change<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function changeRecurrence(recurrence: Recurrence) {
    // A repetição semanal começa marcada no dia da semana do dia de início
    const weekdays = recurrence === "weekly" && values.weekdays.length === 0 ? [buildWeekday(values.day)] : values.weekdays;
    setValues((current) => ({ ...current, recurrence, weekdays }));
  }

  function toggleWeekday(weekday: number) {
    const weekdays = values.weekdays.includes(weekday)
      ? values.weekdays.filter((current) => current !== weekday)
      : [...values.weekdays, weekday].sort((a, b) => a - b);
    change("weekdays", weekdays);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ruleInput = buildRuleInput(values);
    const validation = entry?.isRecurring ? validateOccurrenceEdit(ruleInput, entry.series.day) : validateAppointmentInput(ruleInput);
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }
    setReason(null);
    if (entry?.isRecurring) {
      setStep("save-scope");
      return;
    }
    run(() =>
      entry
        ? updateAppointmentAction({ kind: "all", appointmentId: entry.appointmentId, input: buildActionInput(values) })
        : createAppointmentAction(buildActionInput(values)),
    );
  }

  function saveOnlyThis() {
    if (!entry) return;
    run(() =>
      updateAppointmentAction({
        kind: "one",
        appointmentId: entry.appointmentId,
        originalDay: entry.originalDay,
        input: buildOccurrenceInput(values),
      }),
    );
  }

  // "Todas" leva para a série só o que mudou no formulário; o dia só vale para "Só esta".
  // A Ocorrência aberta, se já era mudada à mão, recebe o formulário como o Usuário deixou.
  function saveAll() {
    if (!entry || !series) return;
    run(() =>
      updateAppointmentAction({
        kind: "all",
        appointmentId: entry.appointmentId,
        input: buildSeriesInput(buildActionInput(values), entry, series),
        editedOccurrence: { originalDay: entry.originalDay, ...buildOccurrenceInput(values) },
      }),
    );
  }

  function remove(scope: "one" | "all") {
    if (!entry) return;
    run(() =>
      deleteAppointmentAction({
        appointmentId: entry.appointmentId,
        scope: scope === "one" ? { kind: "one", originalDay: entry.originalDay } : { kind: "all" },
      }),
    );
  }

  function run(action: () => Promise<{ ok: true } | { ok: true; id: string } | { ok: false; reason: DialogReason }>) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) close();
        else setReason(result.reason);
      } catch {
        setReason("inesperado");
      }
    });
  }

  const dialogTitle = props.mode === "create" ? "Novo Compromisso" : "Editar Compromisso";

  return (
    <>
      <button type="button" aria-label={props.triggerLabel} onClick={open} className={props.triggerClassName}>
        {props.children}
      </button>

      <dialog ref={dialogRef} aria-labelledby={titleId} className={DIALOG}>
        <form onSubmit={submit} noValidate className="grid w-md max-w-full gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-medium tracking-tight">
              {dialogTitle}
            </h2>
            <button type="button" aria-label="Fechar" onClick={close} className={ICON_BUTTON}>
              <X size={16} aria-hidden />
            </button>
          </div>

          {step === "form" && (
            <>
              <label className={FIELD}>
                <span className={FIELD_LABEL}>Título</span>
                <input
                  ref={titleRef}
                  value={values.title}
                  onChange={(event) => change("title", event.target.value)}
                  autoComplete="off"
                  placeholder="Prova de Cálculo"
                  aria-invalid={reason === "titulo-vazio" || reason === "titulo-longo"}
                  className={INPUT}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className={FIELD}>
                  <span className={FIELD_LABEL}>Dia</span>
                  <input type="date" value={values.day} onChange={(event) => change("day", event.target.value)} className={INPUT} />
                </label>
                <label className={FIELD}>
                  <span className={FIELD_LABEL}>Horário (opcional)</span>
                  <input
                    type="time"
                    value={values.timeOfDay}
                    onChange={(event) => change("timeOfDay", event.target.value)}
                    className={INPUT}
                  />
                </label>
              </div>
              {series && series.recurrence !== "none" && (
                <p className="-mt-2 text-meta text-text-muted">
                  O dia muda só esta Ocorrência. Em "Todas", a série continua começando em {buildDayTitle(series.day)}.
                </p>
              )}

              <label className={FIELD}>
                <span className={FIELD_LABEL}>Stood (opcional)</span>
                <select value={values.stoodId} onChange={(event) => change("stoodId", event.target.value)} className={INPUT}>
                  <option value="">Nenhum Stood</option>
                  {props.stoods.map((stood) => (
                    <option key={stood.id} value={stood.id}>
                      {stood.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={FIELD}>
                <span className={FIELD_LABEL}>Repetição</span>
                <select
                  value={values.recurrence}
                  onChange={(event) => changeRecurrence(event.target.value as Recurrence)}
                  className={INPUT}
                >
                  {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((recurrence) => (
                    <option key={recurrence} value={recurrence}>
                      {RECURRENCE_LABELS[recurrence]}
                    </option>
                  ))}
                </select>
              </label>

              {values.recurrence === "weekly" && (
                <fieldset className="grid gap-1.5">
                  <legend className={`${FIELD_LABEL} mb-1.5`}>Dias da semana</legend>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAY_LABELS.map((label, weekday) => (
                      <label
                        key={label}
                        className={`flex h-8 cursor-pointer items-center rounded-md border px-2.5 text-ui has-checked:border-accent has-checked:bg-accent/12 has-checked:text-accent-text has-focus-visible:outline-2 has-focus-visible:outline-accent ${
                          values.weekdays.includes(weekday) ? "" : "border-border text-text-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={values.weekdays.includes(weekday)}
                          onChange={() => toggleWeekday(weekday)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {values.recurrence !== "none" && (
                <label className={FIELD}>
                  <span className={FIELD_LABEL}>Repetir até (opcional)</span>
                  <input type="date" value={values.endsOn} onChange={(event) => change("endsOn", event.target.value)} className={INPUT} />
                </label>
              )}
            </>
          )}

          {step === "save-scope" && (
            <div className="grid gap-3">
              <p className="text-ui">Este Compromisso se repete. A mudança vale para quais Ocorrências?</p>
              {isSeriesRuleChanged && (
                <p className="text-meta text-text-muted">Para mudar a repetição ou a data final, escolha "Todas".</p>
              )}
              {isRecurrenceChanged && entry?.hasChanges && (
                <FormMessage tone="error">
                  As Ocorrências que você mudou ou apagou à mão vão voltar a seguir a repetição nova.
                </FormMessage>
              )}
            </div>
          )}

          {step === "delete" && (
            <p className="text-ui" role="status">
              {entry?.isRecurring
                ? "Apagar só esta Ocorrência ou todas? Não dá para desfazer."
                : "Apagar este Compromisso? Não dá para desfazer."}
            </p>
          )}

          {reason && (
            <FormMessage tone="error" id={errorId}>
              {REASON_MESSAGES[reason]}
            </FormMessage>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isPending && (
              <span role="status" className="mr-auto font-mono text-meta text-text-muted">
                {step === "delete" ? "Apagando…" : "Salvando…"}
              </span>
            )}
            {step === "form" && entry && !isPending && (
              <button
                type="button"
                onClick={() => {
                  setReason(null);
                  setStep("delete");
                }}
                className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.ghost} mr-auto hover:not-disabled:text-danger`}
              >
                Apagar Compromisso
              </button>
            )}

            {step === "form" ? (
              <>
                <button type="button" onClick={close} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
                  {props.mode === "create" ? "Criar Compromisso" : "Salvar"}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setStep("form")} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
                Voltar
              </button>
            )}

            {step === "save-scope" && (
              <>
                <button
                  type="button"
                  disabled={isPending || isSeriesRuleChanged}
                  onClick={saveOnlyThis}
                  className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
                >
                  Só esta
                </button>
                <button type="button" disabled={isPending} onClick={saveAll} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
                  Todas
                </button>
              </>
            )}

            {step === "delete" &&
              (entry?.isRecurring ? (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => remove("one")}
                    className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary} text-danger`}
                  >
                    Só esta
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => remove("all")}
                    className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger}`}
                  >
                    Todas
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove("all")}
                  className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger} ${FOCUS}`}
                >
                  Apagar
                </button>
              ))}
          </div>
        </form>
      </dialog>
    </>
  );
}

// Na Ocorrência de um recorrente, título, dia, horário e Stood vêm dela; a repetição vem da série
function buildInitialValues(props: AppointmentDialogProps): FormValues {
  if (props.mode === "create") {
    return { title: "", day: props.day, timeOfDay: "", stoodId: "", recurrence: "none", weekdays: [], endsOn: "" };
  }
  const { entry } = props;
  return {
    title: entry.title,
    day: entry.day,
    timeOfDay: entry.timeOfDay ?? "",
    stoodId: entry.stoodId ?? "",
    recurrence: entry.series.recurrence,
    weekdays: entry.series.weekdays,
    endsOn: entry.series.endsOn ?? "",
  };
}

function buildRuleInput(values: FormValues) {
  return {
    title: values.title,
    day: values.day,
    timeOfDay: values.timeOfDay || null,
    recurrence: values.recurrence,
    weekdays: values.weekdays,
    endsOn: values.endsOn || null,
  };
}

function buildActionInput(values: FormValues) {
  return { ...buildRuleInput(values), stoodId: values.stoodId || null };
}

function buildOccurrenceInput(values: FormValues) {
  return { title: values.title, day: values.day, timeOfDay: values.timeOfDay || null, stoodId: values.stoodId || null };
}

// 0 é domingo; o dia do formulário pode estar vazio enquanto o Usuário digita
function buildWeekday(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? 0 : date.getUTCDay();
}
