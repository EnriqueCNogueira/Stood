import { ArrowRight } from "lucide-react";
import { Brain } from "@/app/_components/landing/brain";
import { CONTAINER, SECTION } from "@/app/_components/landing/sections";
import { StoodLogo } from "@/app/_components/logo";
import { BUTTON } from "@/app/_components/ui";

// Quem entrou vai direto à Biblioteca; o visitante, a Entrar, que tem o link para criar conta
export function HeroSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section id="inicio" aria-labelledby="inicio-titulo" className={SECTION}>
      <HeroBackdrop />
      <div className={`${CONTAINER} relative`}>
        <div className="flex items-center gap-2 sm:gap-6">
          {/* A logo mede em em, então escala com o text-display como o título de texto escalava */}
          <h1 id="inicio-titulo" className="text-display">
            <StoodLogo variant="word" className="h-[0.8em]" />
          </h1>
          <Brain className="aspect-[1.3] w-[clamp(140px,38vw,640px)] flex-none" />
        </div>
        <p className="mt-2 text-2xl font-light tracking-tight sm:text-3xl lg:text-4xl 2xl:text-5xl">Seu estudo inteiro em uma tela só</p>
        <p className="mt-4 max-w-xl text-base text-text-muted xl:text-lg 2xl:max-w-2xl 2xl:text-xl">
          Abra o Vídeo do YouTube, escreva a Nota em markdown, faça o Desenho e consulte o PDF lado a lado. Você organiza o quadro e os arquivos do seu jeito
        </p>
        <div className="mt-8 flex flex-wrap gap-3 2xl:mt-10 2xl:gap-4">
          <a href={isSignedIn ? "/biblioteca" : "/entrar"} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary}`}>
            Começar a estudar
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </a>
          <a href="#o-que-e" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary}`}>
            Ver como funciona
          </a>
        </div>
      </div>
    </section>
  );
}

// Grade de pontos e brilho laranja e magenta atrás do título, só com tokens
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-radial from-text/10 from-[1px] to-transparent to-[1px] bg-size-[24px_24px] mask-radial-at-[60%_35%] mask-radial-from-15% mask-radial-to-70%" />
      <div className="absolute -top-1/4 -right-[15%] aspect-square w-4/5 bg-radial-[at_45%_50%] from-accent/20 to-transparent to-55% blur-2xl" />
      <div className="absolute top-1/4 -right-[5%] aspect-square w-3/5 bg-radial-[at_60%_60%] from-accent-deep/14 to-transparent to-50% blur-2xl" />
    </div>
  );
}
