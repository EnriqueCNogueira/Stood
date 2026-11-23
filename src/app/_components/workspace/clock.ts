"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TICK_MS = 1000;

// Hora atual no relógio do servidor, renovada a cada segundo enquanto há um Foco ou uma Pausa correndo.
// serverNow é a hora em que o servidor montou a página: a diferença para o navegador corrige um relógio
// local adiantado ou atrasado, para o Foco terminar na tela junto com o servidor.
// now começa nulo para o HTML do servidor não divergir do navegador na hidratação.
export function useServerClock(isRunning: boolean, serverNow: number) {
  const [now, setNow] = useState<number | null>(null);
  const offsetRef = useRef<number | null>(null);

  const readNow = useCallback(() => {
    offsetRef.current ??= serverNow - Date.now();
    return Date.now() + offsetRef.current;
  }, [serverNow]);

  useEffect(() => {
    setNow(readNow());
    if (!isRunning) return;
    const interval = setInterval(() => setNow(readNow()), TICK_MS);
    return () => clearInterval(interval);
  }, [isRunning, readNow]);

  return { now, readNow };
}
