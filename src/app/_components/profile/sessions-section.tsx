"use client";

import { Monitor } from "lucide-react";
import { ConfirmDialog } from "@/app/_components/profile/confirm-dialog";
import { revokeOtherSessionsAction, revokeOwnedSessionAction } from "@/app/_components/profile/profile-actions";
import { ProfileSection } from "@/app/_components/profile/profile-section";
import { BUTTON } from "@/app/_components/ui";

type OwnedSession = { id: string; label: string; lastUsed: string; isCurrent: boolean };

const NOT_FOUND_MESSAGE = "Esta sessão já foi encerrada.";

// Navegadores em que o Usuário está conectado; a Sessão atual se encerra por Sair
export function SessionsSection({ sessions }: { sessions: OwnedSession[] }) {
  async function revoke(sessionId: string) {
    const result = await revokeOwnedSessionAction({ sessionId });
    return result.ok ? null : NOT_FOUND_MESSAGE;
  }

  async function revokeOthers() {
    await revokeOtherSessionsAction();
    return null;
  }

  return (
    <ProfileSection id="profile-sessions" title="Sessões" description="Os navegadores em que você está conectado.">
      <ul className="grid grid-cols-1 divide-y divide-border rounded-md border border-border">
        {sessions.map((session) => (
          <li key={session.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <Monitor size={18} strokeWidth={1.75} aria-hidden className="text-text-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-ui font-medium">{session.label}</p>
              <p className="text-meta text-text-muted">
                {session.isCurrent ? "Esta sessão" : `Último uso ${session.lastUsed}`}
              </p>
            </div>
            {!session.isCurrent && (
              <ConfirmDialog
                title="Encerrar sessão"
                confirmLabel="Encerrar sessão"
                trigger="Encerrar"
                triggerLabel={`Encerrar a sessão em ${session.label}`}
                triggerClassName={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}
                onConfirm={() => revoke(session.id)}
              >
                <p>Quem estiver usando o Stood em {session.label} vai precisar entrar de novo.</p>
              </ConfirmDialog>
            )}
          </li>
        ))}
      </ul>

      {sessions.length > 1 && (
        <ConfirmDialog
          title="Encerrar as outras sessões"
          confirmLabel="Encerrar as outras"
          trigger="Encerrar todas as outras"
          triggerClassName={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary} justify-self-start`}
          onConfirm={revokeOthers}
        >
          <p>Só esta sessão continua conectada.</p>
        </ConfirmDialog>
      )}
    </ProfileSection>
  );
}
