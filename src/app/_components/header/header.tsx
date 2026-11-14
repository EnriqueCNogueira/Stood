import { ThemeMenu } from "@/app/_components/header/theme-menu";
import { BUTTON, FOCUS } from "@/app/_components/ui";
import { UserMenu } from "@/app/_components/header/user-menu";
import { StoodLogo } from "@/app/_components/logo";
import { findCurrentSessionUser } from "@/lib/auth/session";

// Cabeçalho de todas as páginas: o logo leva quem entrou à Biblioteca e o visitante ao Início da landing page
export async function Header() {
  const user = await findCurrentSessionUser();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-3 backdrop-blur-md sm:px-5">
      <a href={user ? "/biblioteca" : "/"} className={`inline-flex items-center rounded-md ${FOCUS}`}>
        <StoodLogo className="h-11" />
      </a>
      <div className="ml-auto flex items-center gap-2">
        <ThemeMenu />
        {user ? (
          <UserMenu name={user.name} email={user.email} image={user.image} />
        ) : (
          <a href="/entrar" className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.primary}`}>
            Entrar
          </a>
        )}
      </div>
    </header>
  );
}
