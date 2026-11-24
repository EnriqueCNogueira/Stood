import type { Metadata } from "next";
import { ConfirmDeletion } from "@/app/_components/profile/confirm-deletion";
import { BUTTON, CARD } from "@/app/_components/ui";
import { isDeletionCodeValid } from "@/lib/auth/deletion";
import { PROFILE_PATH } from "@/lib/auth/destination";
import { requireSession } from "@/lib/auth/session";

// Sem referrer, para o código do link não sair no endereço de origem de outra página
export const metadata: Metadata = { title: "Apagar cadastro · Stood", referrer: "no-referrer", robots: { index: false } };

type ConfirmDeletionPageProps = { searchParams: Promise<{ codigo?: string | string[] }> };

// Página aberta pelo link do e-mail: confere o código e mostra o botão final, sem apagar nada ao abrir
export default async function ConfirmDeletionPage({ searchParams }: ConfirmDeletionPageProps) {
  const user = await requireSession();
  const { codigo } = await searchParams;
  const code = typeof codigo === "string" ? codigo : "";
  const isValid = await isDeletionCodeValid(user.id, code);

  return (
    <main className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-5 px-4 pt-7 pb-16 md:pt-10 2xl:pt-14">
      <h1 className="text-3xl font-medium tracking-tight 2xl:text-4xl">Apagar cadastro</h1>
      <div className={`${CARD} grid grid-cols-1 gap-4 bg-surface p-4 md:p-5`}>
        {isValid ? (
          <>
            <p className="text-ui">
              Isto apaga agora o cadastro de <strong className="font-medium wrap-anywhere">{user.email}</strong>, com todos os Stoods, Arquivos, Tags, Focos e
              Compromissos. Não dá para desfazer.
            </p>
            <ConfirmDeletion code={code} />
          </>
        ) : (
          <>
            <p className="text-ui" role="alert">
              Este link venceu, já foi usado ou é de outro Usuário. Nada foi apagado.
            </p>
            <a href={PROFILE_PATH} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary} justify-self-start`}>
              Voltar ao Perfil
            </a>
          </>
        )}
      </div>
    </main>
  );
}
