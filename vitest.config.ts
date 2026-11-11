import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// O Vitest não lê o .env.local sozinho
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],

    // Marca os casos acima de 500 ms, sem reprovar o teste
    slowTestThreshold: 500,

    // Restaura os mocks, stubs e spies entre os testes
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,

    // Define a chave da API do Resend para os testes
    env: { RESEND_API_KEY: "" },

    // Esconde os logs de testes que enviam emails
    onConsoleLog: (log) => !log.startsWith("email not sent"),
  },
});
