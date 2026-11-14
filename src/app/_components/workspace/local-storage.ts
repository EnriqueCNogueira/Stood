"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "stood-local-storage-change";

// Sem localStorage (aba anônima ou bloqueio), o valor vale só até recarregar a página
const memoryFallback = new Map<string, string>();

// Valor guardado no navegador, acompanhando a mudança feita nesta aba e em outra
export function useStoredValue(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribeToStorage,
    () => getStoredValue(key),
    () => null,
  );

  const setValue = useCallback(
    (next: string) => {
      memoryFallback.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Fica só na memória
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  return [value, setValue];
}

function getStoredValue(key: string) {
  try {
    return localStorage.getItem(key) ?? memoryFallback.get(key) ?? null;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
