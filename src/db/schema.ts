import { type SQL, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Caminho relativo com extensão, porque o seed de dev roda este arquivo direto no Node
import {
  EDGE_WHITESPACE_PATTERN,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  PATH_SEPARATOR_PATTERN,
} from "../lib/stood/details.ts";

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
const YOUTUBE_VIDEO_ID_PATTERN = "^[A-Za-z0-9_-]{11}$";
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
