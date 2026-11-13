import { LinkedinLogo } from "@/app/_components/brand-icons";
import { CONTAINER, EYEBROW, SECTION, SECTION_LEAD, SECTION_TITLE } from "@/app/_components/landing/sections";
import { TEAM, type TeamMember } from "@/app/_components/landing/team";
import { CARD, TEXT_LINK } from "@/app/_components/ui";

export function AboutSection() {
  return (
    <section id="quem-somos" aria-labelledby="quem-somos-titulo" className={SECTION}>
      <div className={CONTAINER}>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={EYEBROW}>Quem Somos</p>
            <h2 id="quem-somos-titulo" className={SECTION_TITLE}>
              Feito por estudantes, para estudar
            </h2>
            <p className={SECTION_LEAD}>
              O Stood é um projeto acadêmico da disciplina de Engenharia de Software da UNIFESP. Criamos a ferramenta que queríamos ter para organizar os nossos próprios estudos
            </p>
          </div>
          {/* O logo foi feito para fundo branco e some no tema escuro, então fica num cartão branco nos dois temas, ao lado do título */}
          <div className="flex-none self-start rounded-lg border border-border bg-logo-backdrop px-4 py-3 shadow-card md:self-center md:px-5 md:py-4">
            <img src="/unifesp.png" alt="Logo da UNIFESP" width={460} height={273} className="h-20 w-auto md:h-28 2xl:h-36" />
          </div>
        </div>

        <ul className="mt-10 grid grid-cols-3 gap-3 sm:gap-5 2xl:mt-14 2xl:gap-8">
          {TEAM.map((member) => (
            <li key={member.name} className={`${CARD} flex flex-col items-center bg-surface px-2 py-6 text-center sm:px-4 2xl:py-10`}>
              <MemberAvatar member={member} />
              <h3 className="mt-4 text-base font-medium 2xl:text-xl">{member.name}</h3>
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`LinkedIn de ${member.name}`}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-sm ${TEXT_LINK}`}
                >
                  <LinkedinLogo size={14} />
                  LinkedIn
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MemberAvatar({ member }: { member: TeamMember }) {
  if (member.photo) {
    return <img src={member.photo} alt="" width={144} height={144} className="size-20 rounded-full border border-border object-cover sm:size-24 2xl:size-36" />;
  }
  return (
    <span aria-hidden className="grid size-20 place-items-center rounded-full border border-border bg-surface-2 text-2xl font-semibold sm:size-24 2xl:size-36 2xl:text-4xl">
      {member.name.charAt(0)}
    </span>
  );
}
