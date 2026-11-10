import { requireSession } from "@/lib/auth/session";

// Destino depois do login. Os repositórios e estudos chegam nas próximas etapas.
export default async function LibraryPage() {
  await requireSession();

  return (
    <main className="mx-auto max-w-[1180px] px-4 pt-7 pb-30 md:px-12 md:pt-10">
      <h1 className="mb-1.5 text-[32px] font-medium tracking-tight">Biblioteca</h1>
      <p className="text-text-muted">Seus repositórios e estudos vão aparecer aqui.</p>
    </main>
  );
}
