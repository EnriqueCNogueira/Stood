"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BUTTON, FOCUS, MENU_ITEM } from "@/app/_components/ui";
import { THEME_STORAGE_KEY, type ThemePreference, buildTheme, parseThemePreference } from "@/lib/theme/theme";

const OPTIONS = [
  { value: "system", label: "Sistema", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
] as const;

const PREFERENCE_CHANGE_EVENT = "stood-theme-change";
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function ThemeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const preference = useSyncExternalStore(subscribeToPreference, readPreference, () => "system" as const);
  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0];

  // Fecha com clique fora ou Esc
  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function selectPreference(next: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sem localStorage, a escolha vale só até recarregar a página
    }
    document.documentElement.dataset.theme = buildTheme(next, matchMedia(DARK_SCHEME_QUERY).matches);
    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Tema: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`${BUTTON.base} ${BUTTON.ghost} size-7.5 rounded-md`}
      >
        <current.Icon size={24} strokeWidth={1.5} aria-hidden />
      </button>

      {isOpen && (
        <div role="menu" aria-label="Tema" className="absolute top-10 right-0 w-40 rounded-md border border-border bg-surface p-1 shadow-card">
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={value === preference}
              onClick={() => selectPreference(value)}
              className={`${MENU_ITEM} cursor-pointer gap-2 hover:bg-surface-2 aria-checked:text-accent-text ${FOCUS}`}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

// Acompanha a escolha feita neste menu e a feita em outra aba
function subscribeToPreference(onChange: () => void) {
  window.addEventListener(PREFERENCE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREFERENCE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
