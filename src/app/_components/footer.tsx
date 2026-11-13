import { TEXT_LINK } from "@/app/_components/ui";

// Rodapé do site: vem do layout raiz em toda página; a landing esconde esse e mostra o mesmo componente na última tela
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer data-site-footer className={`relative border-t border-border ${className}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-6 text-ui text-text-muted sm:flex-row sm:justify-between sm:px-6 lg:px-12 xl:max-w-7xl 2xl:max-w-8xl 2xl:text-sm">
        <p>© 2026 Stood. Projeto acadêmico da UNIFESP.</p>
        <nav aria-label="Legal" className="flex gap-5">
          <a href="/privacidade" className={TEXT_LINK}>
            Privacidade
          </a>
          <a href="/termos" className={TEXT_LINK}>
            Termos
          </a>
        </nav>
      </div>
    </footer>
  );
}
