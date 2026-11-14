"use client";

import { Info } from "lucide-react";
import { useEffect } from "react";
import { POPOVER } from "@/app/_components/ui";

const NOTICE_DURATION_MS = 3000;

export type Notice = { message: string };

// Aviso curto no rodapé da tela, como a recusa ao passar do limite de Janelas
export function BoardNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(onDismiss, NOTICE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [notice, onDismiss]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center">
      {notice && (
        <p className={`flex items-center gap-2.5 px-3.5 py-2.5 text-ui text-text ${POPOVER}`}>
          <Info size={16} aria-hidden className="flex-none text-accent-text" />
          {notice.message}
        </p>
      )}
    </div>
  );
}
