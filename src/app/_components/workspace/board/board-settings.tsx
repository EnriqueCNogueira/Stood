"use client";

import { Settings } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { BUTTON, FOCUS, ICON_BUTTON, MENU_SEPARATOR, POPOVER } from "@/app/_components/ui";
import {
  BOARD_BACKGROUNDS,
  BOARD_SPACINGS,
  BOARD_THEMES,
  type BoardBackground,
  type BoardPreferences,
  type BoardSpacing,
  type BoardTheme,
} from "@/lib/board/preferences";

// Record obriga um rótulo para cada opção das tuplas de preferences.ts
const BACKGROUND_LABELS: Record<BoardBackground, string> = { clean: "Limpo", grid: "Quadriculado", dots: "Pontos" };
const SPACING_LABELS: Record<BoardSpacing, string> = { small: "Pequeno", medium: "Médio", large: "Grande" };
const THEME_LABELS: Record<BoardTheme, string> = { site: "Seguir o site", light: "Claro", dark: "Escuro" };

type BoardSettingsProps = {
  preferences: BoardPreferences;
  hasWindows: boolean;
  onChange: (preferences: BoardPreferences) => void;
  onCloseAll: () => void;
};

// Engrenagem do Quadro: fundo, espaçamento, encaixe, fechar todas e tema
export function BoardSettings({ preferences, hasWindows, onChange, onCloseAll }: BoardSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(containerRef, isOpen, close);
  const isCleanBackground = preferences.background === "clean";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Opções do Quadro"
        aria-expanded={isOpen}
        aria-controls="board-settings"
        onClick={() => setIsOpen((open) => !open)}
        className={`${ICON_BUTTON} bg-surface/85 shadow-card backdrop-blur-sm`}
      >
        <Settings size={18} strokeWidth={1.75} aria-hidden />
      </button>

      {isOpen && (
        <div
          id="board-settings"
          role="dialog"
          aria-label="Opções do Quadro"
          className={`absolute top-10 right-0 z-30 grid w-64 gap-3 p-3 ${POPOVER}`}
        >
          <OptionGroup
            legend="Fundo"
            name="board-background"
            options={BOARD_BACKGROUNDS}
            labels={BACKGROUND_LABELS}
            value={preferences.background}
            onChange={(background) => onChange({ ...preferences, background })}
          />
          <OptionGroup
            legend="Espaçamento"
            name="board-spacing"
            options={BOARD_SPACINGS}
            labels={SPACING_LABELS}
            value={preferences.spacing}
            disabled={isCleanBackground}
            onChange={(spacing) => onChange({ ...preferences, spacing })}
          />
          <label className={`flex items-center gap-2 text-ui ${isCleanBackground ? "opacity-45" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={preferences.snapToGrid && !isCleanBackground}
              disabled={isCleanBackground}
              onChange={(event) => onChange({ ...preferences, snapToGrid: event.target.checked })}
              className={`size-4 accent-accent ${FOCUS}`}
            />
            Encaixar na grade
          </label>

          <div className={MENU_SEPARATOR} />

          <OptionGroup
            legend="Tema do Quadro"
            name="board-theme"
            options={BOARD_THEMES}
            labels={THEME_LABELS}
            value={preferences.theme}
            onChange={(theme) => onChange({ ...preferences, theme })}
          />

          <div className={MENU_SEPARATOR} />

          <button
            type="button"
            disabled={!hasWindows}
            onClick={() => {
              onCloseAll();
              setIsOpen(false);
            }}
            className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}
          >
            Fechar todas as Janelas
          </button>
        </div>
      )}
    </div>
  );
}

type OptionGroupProps<T extends string> = {
  legend: string;
  name: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
};

// Grupo de opções exclusivas, como botões lado a lado
function OptionGroup<T extends string>({ legend, name, options, labels, value, disabled = false, onChange }: OptionGroupProps<T>) {
  return (
    <fieldset disabled={disabled} className="grid gap-1.5 disabled:opacity-45">
      <legend className="mb-1.5 text-xs font-medium text-text-muted">{legend}</legend>
      <div className="grid grid-flow-col gap-1 rounded-md bg-surface-2 p-0.5">
        {options.map((option) => (
          <label
            key={option}
            className="relative grid h-7 place-items-center rounded-sm px-1.5 text-center text-xs text-text-muted has-checked:bg-surface has-checked:text-text has-checked:shadow-card has-focus-visible:outline-2 has-focus-visible:outline-accent has-enabled:cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === value}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
