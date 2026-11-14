import { db } from "@/db";
import { files, folders, type NewFile, type NewFolder, type NewStood, stoods, users } from "@/db/schema";
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
