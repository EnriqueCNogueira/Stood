import { sql } from "drizzle-orm";
import { db } from "@/db";
import { files, folders, type NewFile, type NewFolder, type NewStood, stoodTags, stoods, tags, users } from "@/db/schema";
import { buildUniqueEmail } from "@/test/auth";

// Linhas de Usuário, Stood, Pasta e Arquivo inseridas direto no banco, com e-mail único por caso

export async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: "Ana Souza", email: buildUniqueEmail() })
    .returning({ id: users.id });
  return user.id;
}

export async function createStood(
  ownerId: string,
  name: string,
  values: Partial<Pick<NewStood, "description" | "lastOpenedAt">> = {},
) {
  const [stood] = await db
    .insert(stoods)
    .values({ ownerId, name, ...values })
    .returning({ id: stoods.id });
  return stood;
}

export async function createFolder(
  ownerId: string,
  stoodId: string,
  folder: Partial<Omit<NewFolder, "ownerId" | "stoodId">> = {},
) {
  const [created] = await db
    .insert(folders)
    .values({ name: "Limites", ...folder, ownerId, stoodId })
    .returning({ id: folders.id });
  return created;
}

export async function createFile(ownerId: string, stoodId: string, file: Omit<NewFile, "ownerId" | "stoodId">) {
  const [created] = await db
    .insert(files)
    .values({ ...file, ownerId, stoodId })
    .returning({ id: files.id });
  return created;
}

// Tag do dono, opcionalmente já marcando os Stoods passados
export async function createTag(ownerId: string, name: string, stoodIds: string[] = []) {
  const [tag] = await db.insert(tags).values({ ownerId, name }).returning({ id: tags.id, name: tags.name });
  if (stoodIds.length > 0) {
    await db.insert(stoodTags).values(stoodIds.map((stoodId) => ({ ownerId, stoodId, tagId: tag.id })));
  }
  return tag;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Começa a segunda gravação enquanto a primeira segura a trava e devolve a ordem em que as duas terminaram
export async function trackWriteOrder(lock: (tx: Transaction) => Promise<unknown>, write: () => Promise<unknown>) {
  const order: string[] = [];
  let pending: Promise<unknown> = Promise.resolve();

  await db.transaction(async (tx) => {
    await lock(tx);
    const { rows } = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
    pending = write().then(() => order.push("segunda gravação"));
    await waitUntilBlockedOrSettled(rows[0].pid, () => order.length > 0);
    order.push("primeira gravação");
  });
  await pending;
  return order;
}

// Espera o Postgres mostrar alguém parado atrás desta conexão; se a outra gravação terminar antes, não houve trava
async function waitUntilBlockedOrSettled(holderPid: number, isSettled: () => boolean) {
  while (!isSettled() && !(await isBlockingSomeone(holderPid))) {
    // Consulta de novo até a espera aparecer
  }
}

async function isBlockingSomeone(holderPid: number) {
  const { rows } = await db.execute<{ blocking: boolean }>(
    sql`select exists (select 1 from pg_stat_activity where ${holderPid}::int = any(pg_blocking_pids(pid))) as blocking`,
  );
  return rows[0].blocking;
}
