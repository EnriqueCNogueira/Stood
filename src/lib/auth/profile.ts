import "server-only";

import { and, desc, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import type { CurrentSession } from "@/lib/auth/session";
import { type Device, parseUserAgent } from "@/lib/auth/user-agent";
import { isUuid } from "@/lib/uuid";

export type OwnedSession = Device & { id: string; lastUsedAt: Date; isCurrent: boolean };

export type RevokeOwnedSessionResult = { ok: true } | { ok: false; reason: "sessao-nao-encontrada" };

// Sessões válidas do Usuário, a atual primeiro e depois da mais usada para a menos; o token nunca sai daqui
export async function getSessions({ user, session }: CurrentSession, now = new Date()): Promise<OwnedSession[]> {
  const rows = await db
    .select({ id: sessions.id, userAgent: sessions.userAgent, lastUsedAt: sessions.updatedAt })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, now)))
    .orderBy(desc(sessions.updatedAt));
  const owned = rows.map(({ id, userAgent, lastUsedAt }) => ({ id, ...parseUserAgent(userAgent), lastUsedAt, isCurrent: id === session.id }));
  return [...owned.filter(({ isCurrent }) => isCurrent), ...owned.filter(({ isCurrent }) => !isCurrent)];
}

// Encerra uma das outras Sessões do Usuário; a atual se encerra por Sair
export async function revokeOwnedSession({ user, session }: CurrentSession, sessionId: string): Promise<RevokeOwnedSessionResult> {
  if (!isUuid(sessionId) || sessionId === session.id) return { ok: false, reason: "sessao-nao-encontrada" };
  const revoked = await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
    .returning({ id: sessions.id });
  return revoked.length > 0 ? { ok: true } : { ok: false, reason: "sessao-nao-encontrada" };
}

export async function revokeOtherSessions({ user, session }: CurrentSession): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, session.id)));
}
