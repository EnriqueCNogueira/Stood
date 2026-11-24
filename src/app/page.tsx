import { AboutSection } from "@/app/_components/landing/section4-about";
import { FaqSection } from "@/app/_components/landing/section5-faq";
import { FinalSection } from "@/app/_components/landing/section6-final";
import { HeroSection } from "@/app/_components/landing/section1-start";
import { HowToSection } from "@/app/_components/landing/section3-how-to";
import { SamePageLinks } from "@/app/_components/landing/same-page-links";
import { SectionNav } from "@/app/_components/landing/section-nav";
import { WhatIsSection } from "@/app/_components/landing/section2-what-is";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { findCurrentSessionUser } from "@/lib/auth/session";

type LandingPageProps = { searchParams: Promise<{ cadastro?: string | string[] }> };

// Landing page pública: quem entrou também vê, sem redirecionamento. Quem apagou o cadastro cai aqui com o aviso.
export default async function LandingPage({ searchParams }: LandingPageProps) {
  const user = await findCurrentSessionUser();
  const { cadastro } = await searchParams;

  return (
    <>
      <main data-landing className="2xl:text-lg">
        {cadastro === "apagado" && !user && (
          <div className="mx-auto w-full max-w-2xl px-4 pt-4">
            <FormMessage tone="success">Seu cadastro foi apagado.</FormMessage>
          </div>
        )}
        <HeroSection isSignedIn={Boolean(user)} />
        <WhatIsSection />
        <HowToSection />
        <AboutSection />
        <FaqSection />
        <FinalSection isSignedIn={Boolean(user)} />
      </main>
      <SectionNav />
      <SamePageLinks />
    </>
  );
}
