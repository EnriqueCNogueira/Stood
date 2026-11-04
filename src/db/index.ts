import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Cache do pool de conexões com o PostgreSQL
const globalForDb = globalThis as unknown as { __stoodPool?: Pool };

// Sem throw no escopo do módulo: o next build importa as rotas sem DATABASE_URL
const pool =
  globalForDb.__stoodPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__stoodPool = pool;
}

export const db = drizzle(pool, { schema });
