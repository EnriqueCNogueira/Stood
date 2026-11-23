import { Plus } from "lucide-react";
import { BELOW_HEADER, BUTTON } from "@/app/_components/ui";
import { LibraryBrain } from "@/app/_components/workspace/library/library-brain";
import { LibrarySidebar } from "@/app/_components/workspace/library/library-sidebar";
import { StoodCard } from "@/app/_components/workspace/library/stood-card";
import { WeekPanel } from "@/app/_components/workspace/library/week-panel";
import { StoodDialog } from "@/app/_components/workspace/stood-dialog";
import { requireSession } from "@/lib/auth/session";
import { buildFirstName, buildRelativeTime } from "@/lib/library/library";
import { getWeekSummary } from "@/lib/pomodoro/pomodoro";
import { getLibraryStoods, getRecentStoods } from "@/lib/stood/stood";
import { getTags } from "@/lib/tag/tag";

// Destino depois do login: a semana de estudo, os Stoods do Usuário, os abertos por último, a árvore de todos e as Tags
export default async function LibraryPage() {
  const user = await requireSession();
  const [library, recent, week, tags] = await Promise.all([
    getLibraryStoods(user.id),
    getRecentStoods(user.id),
    getWeekSummary(user.id),
    getTags(user.id),
  ]);
  const firstName = buildFirstName(user.name);
  const now = new Date();

  return (
    <div className={`flex flex-col ${BELOW_HEADER.mdMinHeight} md:flex-row`}>
      <LibrarySidebar stoods={library} tags={tags} />

      <main className="min-w-0 flex-1 px-4 pt-7 pb-16 md:px-12 md:pt-10 2xl:pt-14">
        <h1 className="mb-8 text-3xl font-medium tracking-tight 2xl:text-4xl">{firstName ? `Olá, ${firstName}` : "Olá"}</h1>

        <WeekPanel summary={week} serverNow={now.getTime()} />

        <section aria-labelledby="recent-stoods">
          <h2 id="recent-stoods" className="mb-3.5 text-base font-medium">
            Continuar de onde parou
          </h2>

          {recent.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((stood) => (
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
          ) : (
            <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-border p-6">
              <p className="font-medium">Você ainda não tem nenhum Stood.</p>
              <p className="text-text-muted">Crie o primeiro para reunir as Pastas e os Arquivos de um assunto.</p>
              <StoodDialog
                mode="create"
                allTags={tags.map(({ id, name }) => ({ id, name }))}
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
