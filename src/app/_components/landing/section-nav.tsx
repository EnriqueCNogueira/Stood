"use client";

import { useEffect, useState } from "react";
import { LANDING_SECTIONS } from "@/app/_components/landing/sections";

// Faixa horizontal no meio da tela: o observer avisa quando uma seção a cruza
const MIDDLE_LINE = "-50% 0px -50% 0px";

// Barras laterais da landing page, à esquerda e só a partir de lg; cada barra é uma âncora e funciona sem JS
export function SectionNav() {
  const [currentId, setCurrentId] = useState<string>(LANDING_SECTIONS[0].id);

  useEffect(() => {
    const sections = LANDING_SECTIONS.map(({ id }) => document.getElementById(id)).filter((section) => section !== null);
    // A atual é a última que já passou do meio da tela; assim um salto até a chamada final destaca a última barra
    const observer = new IntersectionObserver(() => {
      const middle = window.innerHeight / 2;
      const passed = sections.filter((section) => section.getBoundingClientRect().top <= middle);
      const current = passed.at(-1) ?? sections[0];
      if (current) setCurrentId(current.id);
    }, { rootMargin: MIDDLE_LINE });
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Seções" className="group/nav fixed top-1/2 left-6 z-40 hidden -translate-y-1/2 flex-col items-start gap-1 lg:flex">
      {LANDING_SECTIONS.map(({ id, name }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={name}
          aria-current={id === currentId ? "true" : undefined}
          className="group/bar flex h-6 items-center gap-3 rounded-sm outline-none"
        >
          <span className="h-1 w-5 rounded-full bg-text-muted/35 transition-all group-hover/nav:w-7 group-focus-within/nav:w-7 group-aria-current/bar:w-9 group-aria-current/bar:bg-accent group-hover/bar:w-11 group-hover/bar:bg-text-muted group-focus-visible/bar:w-11 group-focus-visible/bar:bg-text-muted group-focus-visible/bar:outline-2 group-focus-visible/bar:outline-offset-2 group-focus-visible/bar:outline-accent group-aria-current/bar:group-hover/bar:bg-accent" />
          <span className="rounded-sm bg-bg/85 px-1.5 py-0.5 text-meta whitespace-nowrap 2xl:text-ui text-text-muted opacity-0 backdrop-blur-sm transition group-hover/nav:opacity-100 group-focus-within/nav:opacity-100 group-hover/bar:text-text group-focus-visible/bar:text-text group-aria-current/bar:text-accent-text">
            {name}
          </span>
        </a>
      ))}
    </nav>
  );
}
