import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db";

describe("pool de conexões do banco", () => {
  it("não lança exceção quando uma conexão parada cai", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => db.$client.emit("error", buildTerminatedConnectionError(), idleClient)).not.toThrow();
  });

  it("loga só o código do erro, sem host, usuário nem database", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    db.$client.emit("error", buildTerminatedConnectionError(), idleClient);

    expect(consoleError).toHaveBeenCalledWith("database pool error", { code: "57P01" });
  });

  it("loga o código como desconhecido quando o erro não tem código", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    db.$client.emit("error", new Error("Connection terminated unexpectedly"), idleClient);

    expect(consoleError).toHaveBeenCalledWith("database pool error", { code: "unknown" });
  });
});

// --- Funções auxiliares ---

// Erro que o Neon manda ao suspender o banco com uma conexão parada no pool
function buildTerminatedConnectionError() {
  return Object.assign(new Error("terminating connection due to administrator command"), {
    code: "57P01",
  });
}

// Client com os dados de conexão que não podem aparecer no log
const idleClient = {
  host: "ep-stood.us-east-1.aws.neon.tech",
  user: "stood_app",
  database: "stood",
} as unknown as PoolClient;