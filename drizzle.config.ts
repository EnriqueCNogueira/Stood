import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// O drizzle-kit não lê o .env.local sozinho
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
