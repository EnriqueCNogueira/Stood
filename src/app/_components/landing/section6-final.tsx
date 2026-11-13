import { ArrowRight, ShieldCheck } from "lucide-react";
import { CONTAINER } from "@/app/_components/landing/sections";
import { BUTTON, FOCUS, TEXT_LINK } from "@/app/_components/ui";

// Última tela da landing page: chamada final e rodapé
export function FinalSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section id="estudar" aria-labelledby="estudar-titulo" className="relative flex min-h-[calc(100dvh-3.5rem)] snap-start flex-col overflow-hidden">
      <div className={`${CONTAINER} relative flex flex-1 flex-col items-center justify-center py-16 text-center lg:py-24`}>
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(90vw,720px)] 2xl:w-[960px] -translate-1/2 bg-radial from-accent/16 to-transparent to-60% blur-2xl" />
        <img src="/icon.png" alt="" width={224} height={224} className="relative mb-6 size-44 drop-shadow-xl drop-shadow-accent/40 2xl:mb-8 2xl:size-56" />
        <h2 id="estudar-titulo" className="relative text-4xl font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl 2xl:text-7xl">
          Pronto para estudar?
        </h2>
        <p className="relative mt-3 max-w-md text-base text-pretty text-text-muted xl:text-lg 2xl:mt-4 2xl:max-w-xl 2xl:text-xl">
          Comece agora mesmo a otimizar seu estudo com o Stood
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3 2xl:mt-10 2xl:gap-4">
          {isSignedIn ? (
            <a href="/biblioteca" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary}`}>
              Abrir Biblioteca
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
            </a>
          ) : (
            <>
              <a href="/cadastro" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary}`}>
                Criar conta
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
              </a>
              <a href="/entrar" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary}`}>
                Entrar
              </a>
            </>
          )}
        </div>
        <a
          href="/privacidade"
          className={`relative mt-6 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 text-ui text-text-muted transition hover:text-text 2xl:h-8 2xl:px-3.5 2xl:text-sm ${FOCUS}`}
        >
          <ShieldCheck size={14} strokeWidth={1.75} aria-hidden className="text-accent-text" />
          Seus dados seguem a LGPD
        </a>
      </div>

      {/* No desktop o rodapé sai do fluxo, para a chamada ficar no centro da tela inteira */}
      <footer className="relative border-t border-border lg:absolute lg:inset-x-0 lg:bottom-0">
        <div className={`${CONTAINER} flex flex-col items-center gap-3 py-6 text-ui text-text-muted sm:flex-row sm:justify-between 2xl:text-sm`}>
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
    </section>
  );
}
