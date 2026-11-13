import { PAGE_WIDTH } from "@/app/_components/ui";
import { requireSession } from "@/lib/auth/session";

// Destino depois do login. Os repositórios e estudos chegam nas próximas etapas.
export default async function LibraryPage() {
  await requireSession();

  return (
    <main className={`mx-auto ${PAGE_WIDTH} px-4 pt-7 pb-30 md:px-12 md:pt-10 2xl:pt-14 2xl:text-lg`}>
      <h1 className="mb-1.5 text-3xl font-medium tracking-tight 2xl:mb-2 2xl:text-4xl">Biblioteca</h1>
      <p className="text-text-muted">Seus repositórios e estudos vão aparecer aqui.</p>
    </main>
  );
}
