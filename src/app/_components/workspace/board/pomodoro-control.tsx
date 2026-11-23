"use client";

import { Coffee, Play, Square, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BUTTON } from "@/app/_components/ui";
import { PomodoroSettings } from "@/app/_components/workspace/board/pomodoro-settings";
import { useServerClock } from "@/app/_components/workspace/clock";
import { useStoredValue } from "@/app/_components/workspace/local-storage";
import {
  type CreateFocusActionResult,
  createFocusAction,
  findActiveFocusAction,
  interruptFocusAction,
} from "@/app/_components/workspace/pomodoro-actions";
import type { ActiveFocus } from "@/lib/pomodoro/pomodoro";
import {
  POMODORO_PAUSE_STORAGE_KEY,
  POMODORO_PREFERENCES_STORAGE_KEY,
  type PomodoroPreferences,
  parsePomodoroPause,
  parsePomodoroPreferences,
} from "@/lib/pomodoro/preferences";
import { buildCountdownLabel } from "@/lib/pomodoro/time";

const MS_PER_MINUTE = 60_000;
const CHIME_FREQUENCY_HZ = 880;
const CHIME_SECONDS = 0.8;
const CHIME_VOLUME = 0.2;

type StartFocusFailure = Exclude<Extract<CreateFocusActionResult, { ok: false }>["reason"], "foco-em-andamento">;

const START_FOCUS_MESSAGES: Record<StartFocusFailure, string> = {
  "duracao-invalida": "A duração do Foco precisa ficar entre 5 e 120 minutos.",
  "stood-nao-encontrado": "Este Stood não foi encontrado. Recarregue a página.",
  "entrada-invalida": "Não foi possível iniciar o Foco. Tente de novo.",
};
// Falha de conexão ao iniciar ou interromper o Foco
const CONNECTION_ERROR_MESSAGE = "Não foi possível falar com o Stood. Tente de novo.";

// Aviso abaixo do Pomodoro: erro ou informação, como o Foco descartado
type Message = { text: string; isError: boolean };

type PomodoroControlProps = {
  stoodId: string;
  initialFocus: ActiveFocus | null;
  serverNow: number;
};

// Pomodoro da barra do Quadro: o Foco vem do servidor e é um só para o Usuário; a Pausa fica só no navegador
export function PomodoroControl({ stoodId, initialFocus, serverNow }: PomodoroControlProps) {
  const [focus, setFocus] = useState<ActiveFocus | null>(initialFocus);
  const [ended, setEnded] = useState<"focus" | "pause" | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();
  const [storedPreferences, setStoredPreferences] = useStoredValue(POMODORO_PREFERENCES_STORAGE_KEY);
  const [storedPause, setStoredPause] = useStoredValue(POMODORO_PAUSE_STORAGE_KEY);
  const preferences = useMemo(() => parsePomodoroPreferences(storedPreferences), [storedPreferences]);
  const { now, readNow } = useServerClock(focus !== null || Boolean(storedPause), serverNow);
  const pauseEndsAt = now === null ? undefined : parsePomodoroPause(storedPause, new Date(now))?.getTime();
  const hasSeenPauseRef = useRef(false);

  const focusRemaining = focus && now !== null ? focus.endsAt.getTime() - now : null;
  const pauseRemaining = pauseEndsAt !== undefined && now !== null ? pauseEndsAt - now : null;
  const isFocusRunning = focus !== null;
  const isPauseRunning = !isFocusRunning && pauseRemaining !== null;
  const countdown = isFocusRunning ? focusRemaining : isPauseRunning ? pauseRemaining : null;
  const countdownLabel = countdown === null ? null : buildCountdownLabel(countdown);
  const isFocusInOtherStood = focus !== null && focus.stoodId !== stoodId;

  // O Foco termina sozinho no fim previsto; o servidor já o conta, aqui só toca o som e oferece a Pausa
  useEffect(() => {
    if (!focus || now === null || focus.endsAt.getTime() > now) return;
    setFocus(null);
    setEnded("focus");
    if (preferences.isSoundOn) playChime();
  }, [focus, now, preferences.isSoundOn]);

  // A Pausa vencida sai do navegador; o som só toca se ela terminou com a tela aberta
  useEffect(() => {
    if (now === null || !storedPause) return;
    if (pauseEndsAt !== undefined) {
      hasSeenPauseRef.current = true;
      return;
    }
    setStoredPause("");
    if (!hasSeenPauseRef.current) return;
    hasSeenPauseRef.current = false;
    setEnded("pause");
    if (preferences.isSoundOn) playChime();
  }, [now, storedPause, pauseEndsAt, setStoredPause, preferences.isSoundOn]);

  // Outra aba ou aparelho pode ter iniciado ou interrompido o Foco enquanto esta aba estava escondida.
  // Se o Foco que a tela conhecia terminou nesse tempo, ele fica até o próximo segundo, para o efeito
  // de fim tocar o som e oferecer a Pausa, em vez de sumir sem aviso.
  useEffect(() => {
    async function refreshOnVisible() {
      if (document.visibilityState !== "visible") return;
      try {
        const latest = await findActiveFocusAction();
        setFocus((current) => {
          const hasCurrentEnded = current !== null && current.endsAt.getTime() <= readNow();
          return latest === null && hasCurrentEnded ? current : latest;
        });
      } catch {
        // Sem conexão, a tela segue com o Foco que já conhecia
      }
    }
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => document.removeEventListener("visibilitychange", refreshOnVisible);
  }, [readNow]);

  useEffect(() => {
    if (!countdownLabel) return;
    const previousTitle = document.title;
    document.title = `${countdownLabel} · ${previousTitle}`;
    return () => {
      document.title = previousTitle;
    };
  }, [countdownLabel]);

  function startFocus() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await createFocusAction({ stoodId, durationMinutes: preferences.focusMinutes });
        if (result.ok) {
          setFocus(result.focus);
          setStoredPause("");
          setEnded(null);
          return;
        }
        if (result.reason === "foco-em-andamento") {
          setFocus(await findActiveFocusAction());
          setMessage({ text: "Já existe um Foco em andamento.", isError: false });
          return;
        }
        setMessage({ text: START_FOCUS_MESSAGES[result.reason], isError: true });
      } catch {
        setMessage({ text: CONNECTION_ERROR_MESSAGE, isError: true });
      }
    });
  }

  function interrupt() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await interruptFocusAction();
        setFocus(null);
        setEnded(null);
        if (result.ok && !result.isCounted) setMessage({ text: "Foco descartado: durou menos de 1 minuto.", isError: false });
      } catch {
        setMessage({ text: CONNECTION_ERROR_MESSAGE, isError: true });
      }
    });
  }

  // A Pausa usa o mesmo relógio corrigido da contagem, para não terminar antes ou depois do que mostra
  function startPause() {
    setMessage(null);
    setEnded(null);
    setStoredPause(JSON.stringify({ endsAt: new Date(readNow() + preferences.pauseMinutes * MS_PER_MINUTE).toISOString() }));
  }

  function changePreferences(next: PomodoroPreferences) {
    setStoredPreferences(JSON.stringify(next));
  }

  const status = buildStatusLabel(isFocusRunning, isPauseRunning, ended);

  return (
    <div className="relative inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <div className="flex min-w-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-ui">
        {isPauseRunning ? (
          <Coffee size={14} aria-hidden className="flex-none text-text-muted" />
        ) : (
          <Timer size={14} aria-hidden className={`flex-none ${isFocusRunning ? "text-accent-text" : "text-text-muted"}`} />
        )}
        <span aria-live="polite" className="whitespace-nowrap">
          {status}
        </span>
        {(isFocusRunning || isPauseRunning) && (
          <span role="timer" className="font-mono text-meta tabular-nums">
            {countdownLabel ?? "--:--"}
          </span>
        )}
        {isFocusInOtherStood && focus.stoodName && (
          <span className="max-w-32 truncate text-text-muted" title={`Foco em ${focus.stoodName}`}>
            em {focus.stoodName}
          </span>
        )}
      </div>

      {isFocusRunning ? (
        <button type="button" disabled={isPending} onClick={interrupt} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
          <Square size={12} aria-hidden />
          Interromper
        </button>
      ) : (
        <>
          <button type="button" disabled={isPending} onClick={startFocus} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.primary}`}>
            <Play size={12} aria-hidden />
            Iniciar Foco
          </button>
          {ended === "focus" && (
            <button type="button" onClick={startPause} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
              <Coffee size={12} aria-hidden />
              Iniciar Pausa
            </button>
          )}
        </>
      )}

      <PomodoroSettings preferences={preferences} onChange={changePreferences} />

      {/* O aviso flutua centralizado abaixo dos botões, para não alargar o Pomodoro nem tirar os botões do lugar */}
      {message && (
        <p
          role={message.isError ? "alert" : "status"}
          className={`absolute top-full left-1/2 z-10 mt-0.5 w-max -translate-x-1/2 text-center text-meta ${message.isError ? "text-danger" : "text-text-muted"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function buildStatusLabel(isFocusRunning: boolean, isPauseRunning: boolean, ended: "focus" | "pause" | null) {
  if (isFocusRunning) return "Foco";
  if (isPauseRunning) return "Pausa";
  if (ended === "focus") return "Foco concluído";
  if (ended === "pause") return "Pausa concluída";
  return "Pomodoro";
}

// Som curto gerado pelo navegador, sem arquivo de áudio; falha em silêncio se o navegador bloquear
function playChime() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = CHIME_FREQUENCY_HZ;
    gain.gain.setValueAtTime(CHIME_VOLUME, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + CHIME_SECONDS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => void context.close();
    oscillator.start();
    oscillator.stop(context.currentTime + CHIME_SECONDS);
  } catch {
    // Sem áudio, o fim aparece só na tela
  }
}
