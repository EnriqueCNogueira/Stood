import { sql } from "drizzle-orm";
import { db } from "@/db";

// GET /ready: Verifica se o serviço está pronto
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ready" });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "unknown";
    console.error("ready check failed", { error: errorName });
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
