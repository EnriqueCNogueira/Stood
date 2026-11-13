import { CARD_GRID, CONTAINER, EYEBROW, SECTION, SECTION_LEAD, SECTION_TITLE } from "@/app/_components/landing/sections";
import { CARD } from "@/app/_components/ui";

const STEPS = [
  { title: "Crie um Stood", text: "Na Biblioteca, clique em Novo Stood e dê ao Stood o nome do assunto que vai estudar." },
  { title: "Organize Pastas e Arquivos", text: "Separe o assunto em Pastas e importe Notas, Desenhos, Imagens e PDFs para dentro delas." },
  { title: "Abra no Quadro", text: "Arraste os Arquivos da aba lateral para o Quadro e estude com até 10 Janelas abertas." },
];

export function HowToSection() {
  return (
    <section id="como-usar" aria-labelledby="como-usar-titulo" className={SECTION}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>Como usar</p>
        <h2 id="como-usar-titulo" className={SECTION_TITLE}>
          Três passos até o primeiro Quadro
        </h2>
        <p className={SECTION_LEAD}>Do Stood vazio às Janelas lado a lado em poucos minutos</p>

        <ol className={CARD_GRID}>
          {STEPS.map(({ title, text }, index) => (
            <li key={title} className={`${CARD} bg-surface p-6 2xl:p-8`}>
              <span className="font-mono text-sm text-accent-text 2xl:text-base">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-lg font-medium tracking-tight 2xl:text-2xl">{title}</h3>
              <p className="mt-2 text-text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
