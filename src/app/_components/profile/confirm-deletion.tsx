"use client";

import { useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { deleteUserAction } from "@/app/_components/profile/profile-actions";
import { BUTTON } from "@/app/_components/ui";
import { PROFILE_PATH } from "@/lib/auth/destination";

// Botão final: só ele apaga, para abrir o link nunca apagar sozinho
export function ConfirmDeletion({ code }: { code: string }) {
  const [hasFailed, setHasFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setHasFailed(false);
    startTransition(async () => {
      // Quando dá certo, a Action redireciona e não volta
      const result = await deleteUserAction({ code });
      if (!result.ok) setHasFailed(true);
    });
  }

  return (
    <div className="grid gap-4">
      {hasFailed && <FormMessage tone="error">Este link venceu ou já foi usado. Peça outro no Perfil.</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <a href={PROFILE_PATH} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>
          Voltar ao Perfil
        </a>
        <button type="button" disabled={isPending} onClick={confirm} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger}`}>
          Apagar tudo
        </button>
      </div>
    </div>
  );
}
