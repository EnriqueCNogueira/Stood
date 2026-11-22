import { type SQL, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Caminho relativo com extensão, porque o seed de dev roda este arquivo direto no Node
import { MAX_WINDOWS, type StoredBoardWindow } from "../lib/board/windows.ts";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "../lib/file/image.ts";
import {
  EDGE_WHITESPACE_PATTERN,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  PATH_SEPARATOR_PATTERN,
} from "../lib/stood/details.ts";
import {
  MAX_FOCUS_MINUTES,
  MAX_WEEKLY_GOAL_MINUTES,
  MIN_COUNTED_FOCUS_SECONDS,
  MIN_FOCUS_MINUTES,
  MIN_WEEKLY_GOAL_MINUTES,
  WEEKLY_GOAL_STEP_MINUTES,
} from "../lib/pomodoro/limits.ts";
import { YOUTUBE_VIDEO_ID_PATTERN } from "../lib/video/link.ts";

// --- Autenticação (Better Auth) ---

// Usuário: a pessoa que usa o Stood, identificada por um e-mail único
export const users = pgTable("users", {
  id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Sessão: login ativo de um Usuário, identificado pelo token guardado no cookie
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

// Conta: forma de entrar ligada a um Usuário (Google, GitHub ou e-mail e senha)
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("accounts_userId_idx").on(table.userId),
    // A mesma conta do provedor nunca fica ligada a duas linhas, nem com dois callbacks ao mesmo tempo
    unique("accounts_provider_id_account_id_unique").on(table.providerId, table.accountId),
  ],
);

// Verificação: token temporário dos links de confirmação de e-mail e de troca de senha
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

// --- Domínio ---

export const FILE_TYPES = ["note", "drawing", "image", "pdf", "video"] as const;
export type FileType = (typeof FILE_TYPES)[number];
const TYPES_WITH_CONTENT: FileType[] = ["note", "drawing", "video"];
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

// Stood: o estudo do Usuário, com Pastas e Arquivos sobre um assunto
export const stoods = pgTable(
  "stoods",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Nula quando o Usuário não escreve nada
    description: text("description"),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }).defaultNow().notNull(),
    // Janelas abertas no Quadro, com posição, tamanho e ordem; o formato é conferido por parseStoredWindows
    boardWindows: jsonb("board_windows").$type<StoredBoardWindow[]>().default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Alvo das FKs compostas das filhas, que amarram o dono
    unique("stoods_id_owner_id_unique").on(table.id, table.ownerId),
    uniqueIndex("stoods_owner_id_name_unique").on(table.ownerId, sql`lower(${table.name})`),
    // "Continuar de onde parou": Stoods do Usuário do último aberto para o mais antigo
    index("stoods_owner_id_last_opened_at_idx").on(table.ownerId, table.lastOpenedAt.desc()),
    buildNameCheck("stoods", table.name),
    check(
      "stoods_description_check",
      sql`char_length(${table.description}) <= ${sql.raw(String(MAX_DESCRIPTION_LENGTH))}`,
    ),
    // case garante a ordem: jsonb_array_length dá erro, e não recusa, num valor que não é lista
    check(
      "stoods_board_windows_check",
      sql`case when jsonb_typeof(${table.boardWindows}) = 'array' then jsonb_array_length(${table.boardWindows}) <= ${sql.raw(String(MAX_WINDOWS))} else false end`,
    ),
  ],
);

// Pasta: agrupa Arquivos e outras Pastas dentro de um Stood
export const folders = pgTable(
  "folders",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    stoodId: uuid("stood_id").notNull(),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "folders_stood_id_owner_id_stoods_fk",
      columns: [table.stoodId, table.ownerId],
      foreignColumns: [stoods.id, stoods.ownerId],
    }).onDelete("cascade"),
    // Alvo das FKs de Pasta pai e de Arquivo, que amarram o mesmo Stood e o mesmo dono
    unique("folders_id_stood_id_owner_id_unique").on(table.id, table.stoodId, table.ownerId),
    // Apagar uma Pasta apaga as descendentes
    foreignKey({
      name: "folders_parent_id_folders_fk",
      columns: [table.parentId, table.stoodId, table.ownerId],
      foreignColumns: [table.id, table.stoodId, table.ownerId],
    }).onDelete("cascade"),
    // Busca das filhas no cascade de apagar Pasta
    index("folders_parent_id_idx").on(table.parentId),
    check("folders_parent_id_check", sql`${table.parentId} <> ${table.id}`),
    uniqueIndex("folders_stood_id_parent_id_name_unique").on(
      table.stoodId,
      buildNilWhenNull(table.parentId),
      sql`lower(${table.name})`,
    ),
    buildNameCheck("folders", table.name),
  ],
);

// Arquivo: item de conteúdo de um Stood
export const files = pgTable(
  "files",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    stoodId: uuid("stood_id").notNull(),
    folderId: uuid("folder_id"),
    type: text("type", { enum: FILE_TYPES }).notNull(),
    name: text("name").notNull(),
    // Markdown da Nota, JSON da cena do Desenho ou id do Vídeo; nulo em Imagem e PDF
    content: text("content"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "files_stood_id_owner_id_stoods_fk",
      columns: [table.stoodId, table.ownerId],
      foreignColumns: [stoods.id, stoods.ownerId],
    }).onDelete("cascade"),
    foreignKey({
      name: "files_folder_id_folders_fk",
      columns: [table.folderId, table.stoodId, table.ownerId],
      foreignColumns: [folders.id, folders.stoodId, folders.ownerId],
    }).onDelete("cascade"),
    // Alvo da FK de file_blobs, que amarra o dono
    unique("files_id_owner_id_unique").on(table.id, table.ownerId),
    // Busca dos Arquivos no cascade de apagar Pasta
    index("files_folder_id_idx").on(table.folderId),
    check("files_type_check", sql`${table.type} in (${buildSqlList(FILE_TYPES)})`),
    check(
      "files_content_check",
      sql`(${table.type} in (${buildSqlList(TYPES_WITH_CONTENT)})) = (${table.content} is not null)`,
    ),
    check(
      "files_video_content_check",
      sql`${table.type} <> 'video' or ${table.content} ~ ${sql.raw(`'${YOUTUBE_VIDEO_ID_PATTERN}'`)}`,
    ),
    // O nome não tem extensão: ela sai do tipo na exportação, então só colide dentro do mesmo tipo
    uniqueIndex("files_stood_id_folder_id_type_name_unique").on(
      table.stoodId,
      buildNilWhenNull(table.folderId),
      table.type,
      sql`lower(${table.name})`,
    ),
    buildNameCheck("files", table.name),
  ],
);

// O pg devolve bytea como Buffer e aceita Buffer na escrita
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

// Bytes de um Arquivo enviado pelo Usuário, hoje só de Imagem; fora de files para a árvore nunca ler os bytes
export const fileBlobs = pgTable(
  "file_blobs",
  {
    fileId: uuid("file_id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    // Conferido pelos primeiros bytes no Service, e não pelo que o navegador informa
    mimeType: text("mime_type").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Apagar o Arquivo, o Stood ou o Usuário apaga os bytes
    foreignKey({
      name: "file_blobs_file_id_owner_id_files_fk",
      columns: [table.fileId, table.ownerId],
      foreignColumns: [files.id, files.ownerId],
    }).onDelete("cascade"),
    check("file_blobs_mime_type_check", sql`${table.mimeType} in (${buildSqlList(IMAGE_TYPES)})`),
    check(
      "file_blobs_data_check",
      sql`octet_length(${table.data}) between 1 and ${sql.raw(String(MAX_IMAGE_BYTES))}`,
    ),
  ],
);

// --- Pomodoro ---

// Foco: período cronometrado de estudo, começado num Stood. É dado do Usuário, e não só do Stood:
// por isso tem FK direta para users, e apagar o Stood mantém o Foco contando como Tempo estudado.
// A FK (stood_id, owner_id) para stoods, com ON DELETE SET NULL só de stood_id, foi escrita à mão
// na migration, porque o drizzle-kit não gera SET NULL com lista de colunas.
export const focuses = pgTable(
  "focuses",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Nulo depois que o Stood é apagado
    stoodId: uuid("stood_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    // Nulo enquanto o Foco não é interrompido; sem interrupção, o Foco termina no fim previsto
    interruptedAt: timestamp("interrupted_at", { withTimezone: true }),
  },
  (table) => [
    // Resumo da semana e busca do Foco em andamento, do mais novo ao mais antigo
    index("focuses_owner_id_started_at_idx").on(table.ownerId, table.startedAt.desc()),
    // Busca dos Focos no SET NULL de apagar Stood
    index("focuses_stood_id_idx").on(table.stoodId),
    check(
      "focuses_duration_minutes_check",
      sql`${table.durationMinutes} between ${sql.raw(String(MIN_FOCUS_MINUTES))} and ${sql.raw(String(MAX_FOCUS_MINUTES))}`,
    ),
    // Interrompido com menos do mínimo, o Foco é apagado; depois do fim previsto, não há o que interromper
    check(
      "focuses_interrupted_at_check",
      sql`${table.interruptedAt} is null or (${table.interruptedAt} >= ${table.startedAt} + interval '${sql.raw(String(MIN_COUNTED_FOCUS_SECONDS))} seconds' and ${table.interruptedAt} < ${table.startedAt} + ${table.durationMinutes} * interval '1 minute')`,
    ),
  ],
);

// Meta semanal: uma por Usuário; remover a meta apaga a linha
export const weeklyGoals = pgTable(
  "weekly_goals",
  {
    ownerId: uuid("owner_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    minutes: integer("minutes").notNull(),
  },
  (table) => [
    check(
      "weekly_goals_minutes_check",
      sql`${table.minutes} between ${sql.raw(String(MIN_WEEKLY_GOAL_MINUTES))} and ${sql.raw(String(MAX_WEEKLY_GOAL_MINUTES))} and ${table.minutes} % ${sql.raw(String(WEEKLY_GOAL_STEP_MINUTES))} = 0`,
    ),
  ],
);

function buildNameCheck(tableName: string, name: AnyPgColumn) {
  return check(
    `${tableName}_name_check`,
    sql`char_length(${name}) between 1 and ${sql.raw(String(MAX_NAME_LENGTH))} and ${name} !~ ${sql.raw(`'${PATH_SEPARATOR_PATTERN}'`)} and ${name} !~ ${sql.raw(`'${EDGE_WHITESPACE_PATTERN}'`)}`,
  );
}

function buildNilWhenNull(column: AnyPgColumn): SQL {
  return sql`coalesce(${column}, ${sql.raw(`'${NIL_UUID}'::uuid`)})`;
}

function buildSqlList(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}

export type Stood = typeof stoods.$inferSelect;
export type NewStood = typeof stoods.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
