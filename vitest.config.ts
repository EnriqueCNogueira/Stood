import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
  },
});
