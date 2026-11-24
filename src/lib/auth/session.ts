import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "@/lib/auth/auth";
import { buildSignInPath, REQUESTED_PATH_HEADER } from "@/lib/auth/destination";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

// Sessão atual, para o Perfil marcar qual é e conferir o login recente; nunca leva o token
export type CurrentSession = { user: SessionUser; session: { id: string; createdAt: Date } };

// Ponto de entrada das Views: lê os cabeçalhos da requisição do Next
export async function requireSession(): Promise<SessionUser> {
  return (await requireCurrentSession()).user;
}

export async function findCurrentSessionUser(): Promise<SessionUser | undefined> {
  return (await findRequestSession())?.user;
}

// Uma consulta por requisição, dividida entre cabeçalho, layout e página
const findRequestSession = cache(async () => findCurrentSession(await headers()));

// Sessão ausente, ilegível ou expirada redireciona para /entrar, nunca segue como anônima
export async function requireSessionFromHeaders(requestHeaders: Headers): Promise<SessionUser> {
  return (await requireCurrentSessionFromHeaders(requestHeaders)).user;
}

export async function requireCurrentSession(): Promise<CurrentSession> {
  const current = await findRequestSession();
  if (!current) redirect(buildSignInPath((await headers()).get(REQUESTED_PATH_HEADER)));
  return current;
}

export async function requireCurrentSessionFromHeaders(requestHeaders: Headers): Promise<CurrentSession> {
  const current = await findCurrentSession(requestHeaders);
  if (!current) redirect(buildSignInPath(requestHeaders.get(REQUESTED_PATH_HEADER)));
  return current;
}

// Busca sessão em views públicas, para exibir o usuário logado ou não, sem redirecionar
export async function findSessionUser(requestHeaders: Headers): Promise<SessionUser | undefined> {
  return (await findCurrentSession(requestHeaders))?.user;
}

async function findCurrentSession(requestHeaders: Headers): Promise<CurrentSession | undefined> {
  const found = await getAuth().api.getSession({ headers: requestHeaders, query: { disableRefresh: true } });
  if (!found) return undefined;

  const { id, name, email, image } = found.user;
  return {
    user: { id, name, email, image: image ?? null },
    session: { id: found.session.id, createdAt: found.session.createdAt },
  };
}

// Sair: apaga a sessão atual no banco, o que vale na hora em qualquer aparelho com o mesmo cookie
export async function revokeSession(requestHeaders: Headers): Promise<void> {
  await getAuth().api.signOut({ headers: requestHeaders });
}
