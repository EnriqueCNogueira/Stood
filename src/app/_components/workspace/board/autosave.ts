import { useCallback, useEffect, useRef, useState } from "react";

type SaveResult<Reason extends string> = { ok: true } | { ok: false; reason: Reason };

export type AutosaveStatus<Reason extends string> =
  | { kind: "saved" }
  | { kind: "saving" }
  | { kind: "error"; reason: Reason | "inesperado" };

type AutosaveOptions = {
  delayMs: number;
  // Pede confirmação ao sair da página com algo ainda não salvo
  warnOnLeave: boolean;
};

// Salvamento automático do Quadro e da Nota: espera a pausa, salva um por vez e sempre o valor mais novo,
// para uma resposta atrasada nunca gravar por cima de outra mais nova. Esconder a aba ou desmontar salva o que falta.
export function useAutosave<Value, Reason extends string>(
  initial: Value,
  save: (value: Value) => Promise<SaveResult<Reason>>,
  { delayMs, warnOnLeave }: AutosaveOptions,
) {
  const [status, setStatus] = useState<AutosaveStatus<Reason>>({ kind: "saved" });
  const latestRef = useRef(initial);
  const savedRef = useRef(initial);
  const isSavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      while (latestRef.current !== savedRef.current) {
        const pending = latestRef.current;
        setStatus({ kind: "saving" });
        const result = await saveRef.current(pending).catch(
          (): { ok: false; reason: "inesperado" } => ({ ok: false, reason: "inesperado" }),
        );
        if (!result.ok) {
          setStatus({ kind: "error", reason: result.reason });
          return;
        }
        savedRef.current = pending;
      }
      setStatus({ kind: "saved" });
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  const schedule = useCallback(
    (value: Value) => {
      latestRef.current = value;
      setStatus({ kind: "saving" });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => {
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") void flush();
    }
    function warnUnsaved(event: BeforeUnloadEvent) {
      if (warnOnLeave && latestRef.current !== savedRef.current) event.preventDefault();
    }
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("beforeunload", warnUnsaved);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("beforeunload", warnUnsaved);
      void flush();
    };
  }, [flush, warnOnLeave]);

  return { status, schedule };
}
