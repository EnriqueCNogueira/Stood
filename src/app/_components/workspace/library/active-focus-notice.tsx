"use client";

import { Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useServerClock } from "@/app/_components/workspace/clock";
import { buildCountdownLabel } from "@/lib/pomodoro/time";

type ActiveFocusNoticeProps = { stoodName: string | null; endsAt: Date; serverNow: number };

// Aviso de Foco em andamento na Biblioteca, sem controles; quando o Foco termina, a página relê o Tempo estudado.
// A contagem usa o relógio do servidor, para a releitura já encontrar o Foco encerrado.
export function ActiveFocusNotice({ stoodName, endsAt, serverNow }: ActiveFocusNoticeProps) {
  const router = useRouter();
  const { now } = useServerClock(true, serverNow);
  const remaining = now === null ? null : endsAt.getTime() - now;
  const hasEnded = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (hasEnded) router.refresh();
  }, [hasEnded, router]);

  if (hasEnded) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-accent/12 px-3 py-2 text-ui">
      <Timer size={14} aria-hidden className="text-accent-text" />
      <span className="font-medium">Foco em andamento{stoodName ? ` em ${stoodName}` : ""}</span>
      <span className="font-mono text-meta tabular-nums text-text-muted">
        <span role="timer">{remaining === null ? "--:--" : buildCountdownLabel(remaining)}</span> restantes
      </span>
    </p>
  );
}
