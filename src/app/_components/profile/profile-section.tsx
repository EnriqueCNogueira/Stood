import type { ReactNode } from "react";
import { signInAgain } from "@/app/_components/profile/profile-actions";
import { BUTTON, CARD } from "@/app/_components/ui";

type ProfileSectionProps = { id: string; title: string; description?: string; children: ReactNode };

// Moldura de cada seção do Perfil
export function ProfileSection({ id, title, description, children }: ProfileSectionProps) {
  return (
    <section aria-labelledby={id} className={`${CARD} grid grid-cols-1 gap-4 bg-surface p-4 md:p-5`}>
      <div className="grid gap-1">
        <h2 id={id} className="text-base font-medium">
          {title}
        </h2>
        {description && <p className="text-ui text-text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// Aviso de que a ação pede login recente, com o caminho para entrar de novo
export function SignInAgainNotice({ action }: { action: string }) {
  return (
    <form action={signInAgain} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2">
      <p className="min-w-0 flex-1 text-ui">Você entrou há mais de 1 dia. Para {action}, entre de novo.</p>
      <button type="submit" className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
        Entrar de novo
      </button>
    </form>
  );
}
