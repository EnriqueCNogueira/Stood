// Seed de dev: cria Stoods com Pastas aninhadas, Arquivos dos 5 tipos, Tags, Focos encerrados, a Meta semanal
// e Compromissos na Agenda para um Usuário que já existe.
// Uso: pnpm seed:dev <email>. Só para conferir as telas no navegador; nenhum teste depende dele.

import { existsSync } from "node:fs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { buildShiftedDay, buildTodayInBrasilia } from "../src/lib/agenda/rules.ts";
import { type FileType, appointments, files, focuses, folders, stoodTags, stoods, tags, users, weeklyGoals } from "../src/db/schema.ts";

// Compromissos de exemplo, a partir de hoje; o simulado se repete todo sábado, sem data final
const SATURDAY = 6;
const SEED_APPOINTMENTS = [
  { title: "Prova de Cálculo I", daysFromToday: 5, timeOfDay: "10:00", stoodName: "Cálculo I" },
  { title: "Entrega do relatório de Física", daysFromToday: 9, timeOfDay: null, stoodName: "Física II" },
  { title: "Simulado", daysFromToday: null, timeOfDay: "09:00", stoodName: null },
];

// Tags de exemplo e os Stoods que cada uma marca, pelo nome
const SEED_TAGS: Record<string, string[]> = {
  Prova: ["Cálculo I", "Física II"],
  Exatas: ["Cálculo I", "Física II", "Álgebra linear"],
  "Semestre 1": ["Química geral", "Cálculo I"],
};

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
// Os Focos de exemplo terminam antes de agora, um depois do outro, com este intervalo entre eles
const FOCUS_GAP_MINUTES = 10;
const FIRST_FOCUS_ENDS_AGO_MINUTES = 30;
const SEED_WEEKLY_GOAL_MINUTES = 10 * 60;

// Foco encerrado; com studiedMinutes menor que a duração, ele foi interrompido e conta só esse tempo
type SeedFocus = { stoodName: string; durationMinutes: number; studiedMinutes?: number };

// Do mais antigo ao mais recente: 2 h 48 min no total, 1 h 40 min em Cálculo I, 43 min em Física II e 25 min em Química geral
const SEED_FOCUSES: SeedFocus[] = [
  { stoodName: "Cálculo I", durationMinutes: 50 },
  { stoodName: "Física II", durationMinutes: 25 },
  { stoodName: "Cálculo I", durationMinutes: 25 },
  { stoodName: "Química geral", durationMinutes: 25 },
  { stoodName: "Física II", durationMinutes: 25, studiedMinutes: 18 },
  { stoodName: "Cálculo I", durationMinutes: 25 },
];
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
      { name: "Listas", files: [{ name: "Lista 4", type: "note", content: "# Lista 4\n\n1. Calcule o limite." }] },
    ],
    files: [{ name: "Plano de estudos", type: "note", content: "# Plano\n\n- Revisar limites" }],
  },
  {
    name: "Física II",
    description: "Termodinâmica, ondas e um pouco de óptica, com as listas da professora.",
    openedAgoMs: MS_PER_DAY + MS_PER_HOUR,
    files: [
      { name: "Apostila", type: "note", content: "# Apostila\n\n## Termodinâmica" },
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
    await createSeedTags(db, user.id);
    const createdFocuses = await createSeedFocuses(db, user.id);
    const createdAppointments = await createSeedAppointments(db, user.id);
    await db.insert(weeklyGoals).values({ ownerId: user.id, minutes: SEED_WEEKLY_GOAL_MINUTES }).onConflictDoNothing();
    console.log("seed done", { created, skipped: SEED_STOODS.length - created, createdFocuses, createdAppointments });
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

// Cria os Focos de exemplo só se o Usuário ainda não tem nenhum Foco, para rodar de novo não duplicar o Tempo estudado.
// Todos terminam nas últimas horas, então caem na semana atual, exceto se o seed rodar na madrugada de segunda.
async function createSeedFocuses(db: ReturnType<typeof drizzle>, ownerId: string) {
  const [existing] = await db.select({ id: focuses.id }).from(focuses).where(eq(focuses.ownerId, ownerId)).limit(1);
  if (existing) return 0;

  const stoodRows = await db
    .select({ id: stoods.id, name: stoods.name })
    .from(stoods)
    .where(and(eq(stoods.ownerId, ownerId), inArray(stoods.name, [...new Set(SEED_FOCUSES.map((focus) => focus.stoodName))])));
  const stoodIdByName = new Map(stoodRows.map((stood) => [stood.name, stood.id]));

  // Monta a linha do tempo de trás para frente, a partir do Foco mais recente
  let endsAt = Date.now() - FIRST_FOCUS_ENDS_AGO_MINUTES * MS_PER_MINUTE;
  const rows = [...SEED_FOCUSES].reverse().flatMap((focus) => {
    const stoodId = stoodIdByName.get(focus.stoodName);
    const studiedMinutes = focus.studiedMinutes ?? focus.durationMinutes;
    const startedAt = endsAt - studiedMinutes * MS_PER_MINUTE;
    const isInterrupted = studiedMinutes < focus.durationMinutes;
    const row = {
      ownerId,
      stoodId: stoodId ?? null,
      startedAt: new Date(startedAt),
      durationMinutes: focus.durationMinutes,
      interruptedAt: isInterrupted ? new Date(endsAt) : null,
    };
    endsAt = startedAt - FOCUS_GAP_MINUTES * MS_PER_MINUTE;
    return stoodId ? [row] : [];
  });

  if (rows.length > 0) await db.insert(focuses).values(rows);
  return rows.length;
}

// Cria as Tags que faltam e marca os Stoods de exemplo; rodar de novo não duplica nada.
// A Tag é procurada sem diferenciar maiúsculas, como a regra do banco: "prova" já existente vale como "Prova".
async function createSeedTags(db: ReturnType<typeof drizzle>, ownerId: string) {
  const tagNames = Object.keys(SEED_TAGS);
  const stoodNamesByTag = new Map(Object.entries(SEED_TAGS).map(([name, stoodNames]) => [name.toLowerCase(), stoodNames]));
  await db
    .insert(tags)
    .values(tagNames.map((name) => ({ ownerId, name })))
    .onConflictDoNothing();
  const tagRows = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(eq(tags.ownerId, ownerId), inArray(sql`lower(${tags.name})`, [...stoodNamesByTag.keys()])));
  const stoodRows = await db
    .select({ id: stoods.id, name: stoods.name })
    .from(stoods)
    .where(and(eq(stoods.ownerId, ownerId), inArray(stoods.name, [...new Set(Object.values(SEED_TAGS).flat())])));

  const links = tagRows.flatMap((tag) =>
    stoodRows
      .filter((stood) => stoodNamesByTag.get(tag.name.toLowerCase())?.includes(stood.name))
      .map((stood) => ({ ownerId, stoodId: stood.id, tagId: tag.id })),
  );
  if (links.length > 0) await db.insert(stoodTags).values(links).onConflictDoNothing();
}

// Cria os Compromissos de exemplo só se o Usuário ainda não tem nenhum, para rodar de novo não duplicar
async function createSeedAppointments(db: ReturnType<typeof drizzle>, ownerId: string) {
  const [existing] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.ownerId, ownerId)).limit(1);
  if (existing) return 0;

  const stoodRows = await db.select({ id: stoods.id, name: stoods.name }).from(stoods).where(eq(stoods.ownerId, ownerId));
  const stoodIdByName = new Map(stoodRows.map((stood) => [stood.name, stood.id]));
  const today = buildTodayInBrasilia(new Date());
  // O primeiro simulado é no próximo sábado; se hoje é sábado, no seguinte
  const daysUntilSaturday = (SATURDAY - new Date(`${today}T00:00:00Z`).getUTCDay() + 7) % 7 || 7;

  const rows = SEED_APPOINTMENTS.map((appointment) => {
    const isWeekly = appointment.daysFromToday === null;
    return {
      ownerId,
      title: appointment.title,
      day: buildShiftedDay(today, appointment.daysFromToday ?? daysUntilSaturday),
      timeOfDay: appointment.timeOfDay,
      stoodId: appointment.stoodName ? (stoodIdByName.get(appointment.stoodName) ?? null) : null,
      recurrence: isWeekly ? ("weekly" as const) : ("none" as const),
      weekdays: isWeekly ? [SATURDAY] : [],
    };
  });
  await db.insert(appointments).values(rows);
  return rows.length;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
