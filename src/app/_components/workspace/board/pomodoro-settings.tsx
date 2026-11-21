"use client";

import { Settings2 } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { FIELD, FIELD_LABEL, FOCUS, ICON_BUTTON, INPUT, POPOVER } from "@/app/_components/ui";
import {
  MAX_FOCUS_MINUTES,
  MAX_PAUSE_MINUTES,
  MIN_FOCUS_MINUTES,
  MIN_PAUSE_MINUTES,
  isValidFocusMinutes,
  isValidPauseMinutes,
} from "@/lib/pomodoro/limits";
import type { PomodoroPreferences } from "@/lib/pomodoro/preferences";

type PomodoroSettingsProps = {
  preferences: PomodoroPreferences;
  onChange: (preferences: PomodoroPreferences) => void;
};

// Opções do Pomodoro: duração do Foco e da Pausa e som, guardados no navegador; valem a partir do próximo Foco
export function PomodoroSettings({ preferences, onChange }: PomodoroSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Opções do Pomodoro"
        aria-expanded={isOpen}
        aria-controls="pomodoro-settings"
        onClick={() => setIsOpen((open) => !open)}
        className={ICON_BUTTON}
      >
        <Settings2 size={16} strokeWidth={1.75} aria-hidden />
      </button>

      {isOpen && (
        <div
          id="pomodoro-settings"
          role="dialog"
          aria-label="Opções do Pomodoro"
          className={`absolute top-10 right-0 z-30 grid w-60 gap-3 p-3 ${POPOVER}`}
        >
          <MinutesField
            label="Foco"
            value={preferences.focusMinutes}
            min={MIN_FOCUS_MINUTES}
            max={MAX_FOCUS_MINUTES}
            isValid={isValidFocusMinutes}
            onCommit={(focusMinutes) => onChange({ ...preferences, focusMinutes })}
          />
          <MinutesField
            label="Pausa"
            value={preferences.pauseMinutes}
            min={MIN_PAUSE_MINUTES}
            max={MAX_PAUSE_MINUTES}
            isValid={isValidPauseMinutes}
            onCommit={(pauseMinutes) => onChange({ ...preferences, pauseMinutes })}
          />
          <label className="flex cursor-pointer items-center gap-2 text-ui">
            <input
              type="checkbox"
              checked={preferences.isSoundOn}
              onChange={(event) => onChange({ ...preferences, isSoundOn: event.target.checked })}
              className={`size-4 accent-accent ${FOCUS}`}
            />
            Tocar som no fim do Foco e da Pausa
          </label>
        </div>
      )}
    </div>
  );
}

type MinutesFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  isValid: (minutes: number) => boolean;
  onCommit: (minutes: number) => void;
};

// O campo aceita digitar qualquer coisa, mas só grava a duração válida; a inválida fica marcada até corrigir
function MinutesField({ label, value, min, max, isValid, onCommit }: MinutesFieldProps) {
  const [draft, setDraft] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const hintId = useId();

  // A duração mudou fora do campo, como em outra aba: o campo passa a mostrar o valor salvo.
  // Quando o próprio campo gravou o valor, o rascunho já é ele e fica como está.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (Number(draft) !== value) setDraft(String(value));
  }
  const isDraftValid = draft.trim() !== "" && isValid(Number(draft));

  return (
    <label className={FIELD}>
      <span className={FIELD_LABEL}>{label}, em minutos</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft}
        aria-invalid={!isDraftValid}
        aria-describedby={hintId}
        onChange={(event) => {
          setDraft(event.target.value);
          const minutes = Number(event.target.value);
          if (event.target.value.trim() !== "" && isValid(minutes)) onCommit(minutes);
        }}
        className={INPUT}
      />
      <span id={hintId} className={`text-meta ${isDraftValid ? "text-text-muted" : "text-danger"}`}>
        De {min} a {max} minutos
      </span>
    </label>
  );
}
