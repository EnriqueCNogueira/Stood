import { ChevronDown } from "lucide-react";
import { FAQ_QUESTIONS } from "@/app/_components/landing/faq-questions";
import { EYEBROW, GUTTER, SECTION, SECTION_TITLE } from "@/app/_components/landing/sections";
import { FOCUS } from "@/app/_components/ui";

export function FaqSection() {
  return (
    <section id="perguntas-frequentes" aria-labelledby="perguntas-frequentes-titulo" className={SECTION}>
      <div className={`${GUTTER} max-w-3xl 2xl:max-w-5xl`}>
        <p className={EYEBROW}>Perguntas Frequentes</p>
        <h2 id="perguntas-frequentes-titulo" className={SECTION_TITLE}>
          Dúvidas comuns
        </h2>

        <div className="mt-10 divide-y divide-border border-y border-border 2xl:mt-14">
          {FAQ_QUESTIONS.map(({ question, answer }) => (
            <details key={question} className="group">
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-base font-medium 2xl:py-5 2xl:text-xl [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                {question}
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden className="flex-none text-text-muted transition group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-text-muted 2xl:pb-5">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
