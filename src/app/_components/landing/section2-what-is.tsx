import { File, FileText, Image, LayoutDashboard, PenTool } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { GithubLogo, YoutubeIcon } from "@/app/_components/brand-icons";
import { CARD_GRID, CONTAINER, EYEBROW, SECTION, SECTION_LEAD, SECTION_TITLE } from "@/app/_components/landing/sections";
import { CARD } from "@/app/_components/ui";

type IconProps = { size?: number; strokeWidth?: number; "aria-hidden"?: boolean };

const FILE_TYPES: { label: string; Icon: ComponentType<IconProps> }[] = [
  { label: "Vídeo do YouTube", Icon: YoutubeIcon },
  { label: "Nota em markdown", Icon: FileText },
  { label: "Desenho", Icon: PenTool },
  { label: "Imagem", Icon: Image },
  { label: "PDF", Icon: File },
];

export function WhatIsSection() {
  return (
    <section id="o-que-e" aria-labelledby="o-que-e-titulo" className={SECTION}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>O que é o Stood</p>
        <h2 id="o-que-e-titulo" className={SECTION_TITLE}>
          Todo o seu estudo num lugar só
        </h2>
        <p className={SECTION_LEAD}>Chega de alternar entre abas. Cada Stood reúne os Arquivos de um assunto e abre todos juntos, do jeito que você quiser</p>

        <div className={CARD_GRID}>
          <Feature icon={<LayoutDashboard size={20} strokeWidth={1.75} aria-hidden />} title="Tudo lado a lado no Quadro" caption="Quadro com Vídeo, Nota e Desenho">
            Arraste os Arquivos para o Quadro e abra cada um numa Janela que você move e redimensiona. O conteúdo salva sozinho.
          </Feature>

          <Feature icon={<FileText size={20} strokeWidth={1.75} aria-hidden />} title="Cinco tipos de Arquivo" caption="Pastas e Arquivos de um Stood">
            <span className="flex flex-wrap gap-1.5">
              {FILE_TYPES.map(({ label, Icon }) => (
                <span key={label} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-ui text-text 2xl:h-8 2xl:px-3 2xl:text-sm">
                  <Icon size={14} strokeWidth={1.75} aria-hidden />
                  {label}
                </span>
              ))}
            </span>
          </Feature>

          <Feature icon={<GithubLogo size={28} />} title="Exporte quando quiser" caption="Versões do Stood no GitHub">
            Publique uma versão do Stood num Repositório do GitHub ou baixe o Stood inteiro em .zip.
          </Feature>
        </div>
      </div>
    </section>
  );
}

// Moldura vazia no lugar da ilustração, até existir a captura de tela real
function Feature({ icon, title, caption, children }: { icon: ReactNode; title: string; caption: string; children: ReactNode }) {
  return (
    <article className={`${CARD} flex flex-col bg-surface p-5 2xl:p-7`}>
      <figure className="order-last mt-5 2xl:mt-7">
        <div className="rounded-lg bg-linear-135 from-accent-text via-accent to-accent-deep p-2.5">
          <div className="grid aspect-video place-items-center rounded-md bg-bg/90 text-text-muted">{icon}</div>
        </div>
        <figcaption className="mt-2 text-center font-mono text-meta text-text-muted">{caption}</figcaption>
      </figure>
      <h3 className="text-lg font-medium tracking-tight 2xl:text-2xl">{title}</h3>
      <div className="mt-2 text-text-muted">{children}</div>
    </article>
  );
}
