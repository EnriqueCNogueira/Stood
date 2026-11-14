import type { ReactNode } from "react";
import { TEXT_LINK } from "@/app/_components/ui";

// Controlador dos dados e canal do titular, citados em Privacidade e Termos
export const DATA_CONTROLLER = "Enrique Nogueira";
export const CONTACT_EMAIL = "stooddev@gmail.com";
export const LEGAL_UPDATED_AT = "14 de novembro de 2026";

export function ContactEmail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={TEXT_LINK}>
      {CONTACT_EMAIL}
    </a>
  );
}

type LegalPageProps = { title: string; lead: string; other: { href: string; label: string }; children: ReactNode };

// Moldura de Privacidade e Termos: cada página termina com o link para a outra
export function LegalPage({ title, lead, other, children }: LegalPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 2xl:max-w-4xl 2xl:py-20 2xl:text-lg">
      <p className="font-mono text-meta text-text-muted 2xl:text-ui">Atualizado em {LEGAL_UPDATED_AT}</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl 2xl:text-5xl">{title}</h1>
      <p className="mt-4 text-base text-text-muted 2xl:text-xl">{lead}</p>
      <div className="mt-10 grid gap-8">{children}</div>
      <p className="mt-12 border-t border-border pt-6 text-text-muted">
        Leia também: <a href={other.href} className={TEXT_LINK}>{other.label}</a>
      </p>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 text-text-muted [&_strong]:font-medium [&_strong]:text-text">
      <h2 className="text-xl font-medium tracking-tight text-text 2xl:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-1.5 pl-5 marker:text-text-muted">{children}</ul>;
}
