"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { deleteUserAction } from "@/app/_components/profile/profile-actions";
import { BUTTON } from "@/app/_components/ui";
import { PROFILE_PATH } from "@/lib/auth/destination";

// Botão final: só ele apaga, para abrir o link nunca apagar sozinho
export function ConfirmDeletion({ code }: { code: string }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      try {
        // Quando dá certo, a Action redireciona e não volta
        const result = await deleteUserAction({ code });
        if (!result.ok) setError("Este link venceu ou já foi usado. Peça outro no Perfil.");
      } catch (failure) {
        // O redirecionamento chega como exceção e precisa seguir
        unstable_rethrow(failure);
        setError("Não deu certo. Tente de novo.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      {error && <FormMessage tone="error">{error}</FormMessage>}
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
