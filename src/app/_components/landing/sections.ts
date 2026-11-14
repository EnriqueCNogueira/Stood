import { PAGE_WIDTH } from "@/app/_components/ui";

// Seções da landing page, na ordem da tela; cada uma tem uma barra na navegação lateral
export const LANDING_SECTIONS = [
  { id: "inicio", name: "Início" },
  { id: "o-que-e", name: "O que é o Stood" },
  { id: "como-usar", name: "Como usar" },
  { id: "quem-somos", name: "Quem Somos" },
  { id: "perguntas-frequentes", name: "Perguntas Frequentes" },
  { id: "estudar", name: "Stood" },
] as const;

// Cada seção ocupa no mínimo a tela, descontado o cabeçalho de 3.5rem; o snap só liga a partir de lg, no globals.css
export const SECTION = "relative flex min-h-[calc(100dvh-3.5rem)] snap-start flex-col justify-center overflow-hidden py-16 lg:py-12";
// Margem lateral maior a partir de lg, para o texto não encostar na navegação lateral
export const GUTTER = "mx-auto w-full px-4 sm:px-6 lg:px-20 2xl:px-12";
export const CONTAINER = `${GUTTER} ${PAGE_WIDTH}`;
export const EYEBROW = "text-xs font-medium tracking-widest text-accent-text uppercase 2xl:text-sm";
export const SECTION_TITLE = "mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl 2xl:text-6xl";
export const SECTION_LEAD = "mt-4 max-w-2xl text-base text-text-muted xl:text-lg 2xl:max-w-3xl 2xl:text-xl";
// Grade de cards das seções
export const CARD_GRID = "mt-10 grid gap-5 md:grid-cols-3 2xl:mt-14 2xl:gap-8";
