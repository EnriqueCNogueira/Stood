// Seed de dev: cria Stoods com Pastas aninhadas e Arquivos dos 5 tipos para um Usuário que já existe.
// Uso: pnpm seed:dev <email>. Só para conferir as telas no navegador; nenhum teste depende dele.

import { existsSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { type FileType, files, folders, stoods, users } from "../src/db/schema.ts";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DRAWING_CONTENT = JSON.stringify({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} });

type SeedFile = { name: string; type: FileType; content?: string };
type SeedFolder = { name: string; folders?: SeedFolder[]; files?: SeedFile[] };
type SeedStood = SeedFolder & { description: string | null; openedAgoMs: number };

const SEED_STOODS: SeedStood[] = [
  {
    name: "Cálculo I",
    description: "Limites, derivadas e integrais para a primeira prova.",
    openedAgoMs: MS_PER_HOUR,
    folders: [
      {
        name: "Aulas",
        files: [
          { name: "Limites e continuidade", type: "video", content: "WUvTyaaNkzM" },
          { name: "Quadro da aula 3", type: "image" },
        ],
        folders: [
          {
            name: "Limites",
            files: [{ name: "Resumo de limites", type: "note", content: "# Limites\n\nf(x) se aproxima de L." }],
            folders: [{ name: "Derivadas", files: [{ name: "Gráfico da tangente", type: "drawing", content: DRAWING_CONTENT }] }],
          },
        ],
      },
      { name: "Listas", files: [{ name: "Lista 4", type: "pdf" }] },
    ],
    files: [{ name: "Plano de estudos", type: "note", content: "# Plano\n\n- Revisar limites" }],
  },
  {
    name: "Física II",
    description: "Termodinâmica, ondas e um pouco de óptica, com as listas da professora.",
    openedAgoMs: MS_PER_DAY + MS_PER_HOUR,
    files: [
      { name: "Apostila", type: "pdf" },
      { name: "Ondas estacionárias", type: "video", content: "BSIw5SgUirg" },
      { name: "Fórmulas", type: "note", content: "# Fórmulas" },
    ],
  },
  {
    name: "Química geral",
    description: null,
    openedAgoMs: 3 * MS_PER_DAY,
    folders: [{ name: "Relatórios" }, { name: "Laboratório", files: [{ name: "Titulação", type: "image" }] }],
  },
  {
    name: "Álgebra linear",
    description:
      "Espaços vetoriais, transformações lineares, autovalores e autovetores. Descrição longa de propósito, para conferir o corte em duas linhas no cartão da Biblioteca.",
    openedAgoMs: 10 * MS_PER_DAY,
  },
];

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
await main(process.argv[2]);

async function main(email: string | undefined) {
  if (process.env.NODE_ENV === "production") fail("refusing to seed with NODE_ENV=production");
  if (!email) fail("usage: pnpm seed:dev <email>");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) fail("user not found");

    let created = 0;
    for (const stood of SEED_STOODS) {
      const [existing] = await db
        .select({ id: stoods.id })
        .from(stoods)
        .where(and(eq(stoods.ownerId, user.id), eq(stoods.name, stood.name)))
        .limit(1);
      if (existing) continue;

      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(stoods)
          .values({
            ownerId: user.id,
            name: stood.name,
            description: stood.description,
            lastOpenedAt: new Date(Date.now() - stood.openedAgoMs),
          })
          .returning({ id: stoods.id });
        await createFolderContent(tx, user.id, row.id, null, stood);
      });
      created++;
    }
    console.log("seed done", { created, skipped: SEED_STOODS.length - created });
  } finally {
    await pool.end();
  }
}

type Transaction = Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0];

async function createFolderContent(
  tx: Transaction,
  ownerId: string,
  stoodId: string,
  folderId: string | null,
  folder: SeedFolder,
) {
  if (folder.files?.length) {
    await tx.insert(files).values(
      folder.files.map((file) => ({ ownerId, stoodId, folderId, type: file.type, name: file.name, content: file.content ?? null })),
    );
  }
  for (const child of folder.folders ?? []) {
    const [row] = await tx
      .insert(folders)
      .values({ ownerId, stoodId, parentId: folderId, name: child.name })
      .returning({ id: folders.id });
    await createFolderContent(tx, ownerId, stoodId, row.id, child);
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
