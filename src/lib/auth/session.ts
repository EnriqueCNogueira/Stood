import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "@/lib/auth/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

const SIGN_IN_PATH = "/entrar";

// Ponto de entrada das Views: lê os cabeçalhos da requisição do Next
export async function requireSession(): Promise<SessionUser> {
  const user = await findCurrentSessionUser();
  if (!user) redirect(SIGN_IN_PATH);
  return user;
}

// Uma consulta por requisição, dividida entre cabeçalho, layout e página
export const findCurrentSessionUser = cache(async (): Promise<SessionUser | undefined> => {
  return findSessionUser(await headers());
});

// Sessão ausente, ilegível ou expirada redireciona para /entrar, nunca segue como anônima
export async function requireSessionFromHeaders(requestHeaders: Headers): Promise<SessionUser> {
  const user = await findSessionUser(requestHeaders);
  if (!user) redirect(SIGN_IN_PATH);
  return user;
}

// Busca sessão em views públicas, para exibir o usuário logado ou não, sem redirecionar
export async function findSessionUser(requestHeaders: Headers): Promise<SessionUser | undefined> {
  const session = await getAuth().api.getSession({ headers: requestHeaders, query: { disableRefresh: true } });
  if (!session) return undefined;

  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}

// Sair: apaga a sessão atual no banco, o que vale na hora em qualquer aparelho com o mesmo cookie
export async function revokeSession(requestHeaders: Headers): Promise<void> {
  await getAuth().api.signOut({ headers: requestHeaders });
}
