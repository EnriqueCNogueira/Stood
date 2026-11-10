import { HeaderNav } from "@/components/header-nav";
import { BUTTON } from "@/components/ui";
import { UserMenu } from "@/components/user-menu";
import { findCurrentSessionUser } from "@/lib/auth/session";

// Cabeçalho de todas as páginas: avatar com menu para quem entrou, botão "Entrar" para o visitante
export async function Header() {
  const user = await findCurrentSessionUser();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-3 backdrop-blur-md sm:gap-6 sm:px-5">
      <a href="/" className="inline-flex items-center gap-2.5 text-base font-semibold">
        <img src="/icon.png" width={28} height={28} alt="" />
        <span className="hidden sm:inline">Stood</span>
      </a>
      <HeaderNav />
      <div className="ml-auto flex items-center gap-2">
        <button type="button" data-theme-toggle aria-label="Alternar tema" className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.ghost}`}>
          <span className="dark:hidden">Escuro</span>
          <span className="hidden dark:inline">Claro</span>
        </button>
        {user ? (
          <UserMenu name={user.name} email={user.email} image={user.image} />
        ) : (
          <a href="/entrar" className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
            Entrar
          </a>
        )}
      </div>
    </header>
  );
}
