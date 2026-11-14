import { BELOW_HEADER, TEXT_LINK } from "@/app/_components/ui";

// Resposta de notFound() em qualquer rota, inclusive o Stood de outro Usuário: não revela se ele existe
export default function NotFound() {
  return (
    <main className={`mx-auto grid ${BELOW_HEADER.minHeight} w-full max-w-sm content-center gap-2 px-4 py-10 text-center`}>
      <h1 className="text-2xl font-medium tracking-tight">Página não encontrada</h1>
      <p className="text-text-muted">O endereço não existe ou você não tem acesso a ele.</p>
      <a href="/biblioteca" className={`${TEXT_LINK} justify-self-center`}>
        Ir para a Biblioteca
      </a>
    </main>
  );
}
