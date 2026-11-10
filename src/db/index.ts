import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Cache do pool de conexões com o PostgreSQL
const globalForDb = globalThis as unknown as { __stoodPool?: Pool };

// Sem throw no escopo do módulo: o next build importa as rotas sem DATABASE_URL
const pool = globalForDb.__stoodPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__stoodPool = pool;
}

export const db = drizzle(pool, { schema });

function createPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Trata o erro de conexão parada no pool, que o Neon manda quando o banco é suspenso
  pool.on("error", (error) => {
    const code = "code" in error && typeof error.code === "string" ? error.code : "unknown";
    console.error("database pool error", { code });
  });

  return pool;
}
