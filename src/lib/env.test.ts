import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireEnv } from "@/lib/env";

describe("requireEnv", () => {
  beforeEach(() => {
    stubValidEnv();
  });

  it("aceita RESEND_API_KEY vazia fora de produção, como ausente", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");

    expect(requireEnv().RESEND_API_KEY).toBeUndefined();
  });

  it("exige RESEND_API_KEY em produção", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");

    expect(() => requireEnv()).toThrow("invalid environment variables: RESEND_API_KEY");
  });

  it("lista só o nome das variáveis inválidas, sem o valor", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "segredo-curto-que-vazou");

    expect(() => requireEnv()).toThrow(/^invalid environment variables: BETTER_AUTH_SECRET$/);
  });
});

// --- Funções auxiliares ---

function stubValidEnv() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgres://stood:stood@localhost:5432/stood");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-secret-with-at-least-32-chars");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-google-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-github-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-github-client-secret");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
}
