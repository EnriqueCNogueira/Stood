"use client";

import { X } from "lucide-react";
import { type ReactNode, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, DIALOG, ICON_BUTTON } from "@/app/_components/ui";

type ConfirmDialogProps = {
  title: string;
  confirmLabel: string;
  triggerLabel?: string;
  triggerClassName: string;
  trigger: ReactNode;
  // Devolve a mensagem da recusa, ou nulo quando deu certo
  onConfirm: () => Promise<string | null>;
  children: ReactNode;
};

const UNEXPECTED_MESSAGE = "Não deu certo. Tente de novo.";

// Diálogo de confirmar do Perfil: fica aberto, com a mensagem, quando a ação é recusada
export function ConfirmDialog({ title, confirmLabel, triggerLabel, triggerClassName, trigger, onConfirm, children }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setMessage(null);
    dialogRef.current?.showModal();
  }

  function confirm() {
    startTransition(async () => {
      try {
        const refusal = await onConfirm();
        if (refusal) setMessage(refusal);
        else dialogRef.current?.close();
      } catch {
        setMessage(UNEXPECTED_MESSAGE);
      }
    });
  }

  return (
    <>
      <button type="button" aria-label={triggerLabel} onClick={open} className={triggerClassName}>
        {trigger}
      </button>

      <dialog ref={dialogRef} aria-labelledby={titleId} className={DIALOG}>
        <div className="grid w-md max-w-full gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 id={titleId} className="text-lg font-medium tracking-tight">
              {title}
            </h3>
            <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="grid gap-2 text-ui">{children}</div>
          {message && <FormMessage tone="error">{message}</FormMessage>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
              Cancelar
            </button>
            <button type="button" disabled={isPending} onClick={confirm} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
