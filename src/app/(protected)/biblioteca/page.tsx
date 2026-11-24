import { Plus } from "lucide-react";
import { BELOW_HEADER, BUTTON } from "@/app/_components/ui";
import { LibraryBrain } from "@/app/_components/workspace/library/library-brain";
import { LibrarySidebar } from "@/app/_components/workspace/library/library-sidebar";
import { StoodCard } from "@/app/_components/workspace/library/stood-card";
import { SubjectCard } from "@/app/_components/workspace/library/subject-card";
import { UpcomingAppointments } from "@/app/_components/workspace/library/upcoming-appointments";
import { WeekPanel } from "@/app/_components/workspace/library/week-panel";
import { StoodDialog } from "@/app/_components/workspace/stood-dialog";
import { requireSession } from "@/lib/auth/session";
import { getUpcomingAppointments } from "@/lib/agenda/agenda";
import { buildTodayInBrasilia } from "@/lib/agenda/rules";
import { buildFirstName, buildRelativeTime } from "@/lib/library/library";
import { getWeekSummary } from "@/lib/pomodoro/pomodoro";
import { getLibraryStoods, getRecentStoods } from "@/lib/stood/stood";
import { SUBJECTS } from "@/lib/subject/catalog";
import { filterStoodsByTags } from "@/lib/tag/rules";
import { getTags } from "@/lib/tag/tag";

// Linha e respiro entre as seções da Biblioteca
const SECTION_DIVIDER = "mt-10 border-t border-border pt-8 2xl:mt-12 2xl:pt-10";

// Destino depois do login: a semana de estudo, os próximos Compromissos, as Matérias, os Stoods abertos por último,
// a árvore de todos e as Tags
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tags?: string | string[] }> }) {
  const user = await requireSession();
  const selectedTagIds = buildSelectedTagIds((await searchParams).tags);
  const now = new Date();
  const [library, recent, week, tags, upcoming] = await Promise.all([
    getLibraryStoods(user.id),
    getRecentStoods(user.id),
    getWeekSummary(user.id, now),
    getTags(user.id),
    getUpcomingAppointments(user.id, now),
  ]);
  const allTags = tags.map(({ id, name }) => ({ id, name }));
  // Id de Tag que não é do dono não casa com nenhum Stood e só esvazia o filtro dele
  const visibleRecent = filterStoodsByTags(recent, new Set(selectedTagIds));
  const firstName = buildFirstName(user.name);

  return (
    <div className={`flex flex-col ${BELOW_HEADER.mdMinHeight} md:flex-row`}>
      <LibrarySidebar stoods={library} tags={tags} selectedTagIds={selectedTagIds} />

      <main className="min-w-0 flex-1 px-4 pt-7 pb-16 md:px-12 md:pt-10 2xl:pt-14">
        <h1 className="mb-8 text-3xl font-medium tracking-tight 2xl:text-4xl">{firstName ? `Olá, ${firstName}` : "Olá"}</h1>

        <WeekPanel summary={week} serverNow={now.getTime()} />

        <UpcomingAppointments items={upcoming} today={buildTodayInBrasilia(now)} />

        <section aria-labelledby="subjects" className={SECTION_DIVIDER}>
          <h2 id="subjects" className="mb-1 text-base font-medium">
            Matérias
          </h2>
          <p className="mb-3.5 text-ui text-text-muted">
            Stoods prontos com as aulas de cada Matéria. Clique numa delas para criar a sua cópia, que você pode editar.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SUBJECTS.map((subject) => (
              <SubjectCard
                key={subject.slug}
                slug={subject.slug}
                name={subject.name}
                description={subject.description}
                videoCount={subject.videos.length}
                allTags={allTags}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="recent-stoods" className={SECTION_DIVIDER}>
          <h2 id="recent-stoods" className="mb-3.5 text-base font-medium">
            Continuar de onde parou
          </h2>

          {visibleRecent.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleRecent.map((stood) => (
                <StoodCard
                  key={stood.id}
                  id={stood.id}
                  name={stood.name}
                  description={stood.description}
                  tags={stood.tags}
                  fileCounts={stood.fileCounts}
                  openedAgo={buildRelativeTime(stood.lastOpenedAt, now)}
                />
              ))}
            </div>
          ) : recent.length > 0 ? (
            <p className="text-ui text-text-muted">Nenhum Stood recente com essas Tags.</p>
          ) : (
            <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-border p-6">
              <p className="font-medium">Você ainda não tem nenhum Stood.</p>
              <p className="text-text-muted">Crie o primeiro para reunir as Pastas e os Arquivos de um assunto.</p>
              <StoodDialog
                mode="create"
                allTags={allTags}
                triggerClassName={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}
              >
                <Plus size={16} aria-hidden />
                Criar o primeiro Stood
              </StoodDialog>
            </div>
          )}
        </section>
      </main>

      <LibraryBrain />
    </div>
  );
}

// ?tags= traz os ids separados por vírgula; repetido ou vazio vira lista sem eles
function buildSelectedTagIds(param: string | string[] | undefined): string[] {
  const value = Array.isArray(param) ? param.join(",") : (param ?? "");
  return [...new Set(value.split(",").filter((id) => id !== ""))];
}
