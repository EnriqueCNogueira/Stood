import "server-only";

import { sql } from "drizzle-orm";
import type { db } from "@/db";

type LockTopic = "focuses" | "tags" | "appointments" | "accounts";

// Serializa as escritas do tema para o mesmo Usuário até o fim da transação: duas abas não passam juntas de um limite
// nem uma grava com o que a outra acabou de mudar
export async function requireOwnerLock(tx: Pick<typeof db, "execute">, ownerId: string, topic: LockTopic) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${topic}:${ownerId}`}, 0))`);
}
