import { AboutSection } from "@/app/_components/landing/section4-about";
import { FaqSection } from "@/app/_components/landing/section5-faq";
import { FinalSection } from "@/app/_components/landing/section6-final";
import { HeroSection } from "@/app/_components/landing/section1-start";
import { HowToSection } from "@/app/_components/landing/section3-how-to";
import { SamePageLinks } from "@/app/_components/landing/same-page-links";
import { SectionNav } from "@/app/_components/landing/section-nav";
import { WhatIsSection } from "@/app/_components/landing/section2-what-is";
import { findCurrentSessionUser } from "@/lib/auth/session";

// Landing page pública: quem entrou também vê, sem redirecionamento
export default async function LandingPage() {
  const user = await findCurrentSessionUser();

  return (
    <>
      <main data-landing className="2xl:text-lg">
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
