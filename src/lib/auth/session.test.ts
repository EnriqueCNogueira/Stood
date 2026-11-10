import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import { findSessionUser, requireSessionFromHeaders, revokeSession } from "@/lib/auth/session";
import { createSignedInUser, expectRedirectToSignIn, warmUpAuth } from "@/test/auth";

beforeAll(warmUpAuth);

describe("requireSessionFromHeaders", () => {
  it("devolve o Usuário da sessão válida", async () => {
    const { email, headers } = await createSignedInUser();

    const user = await requireSessionFromHeaders(headers);

    expect(user).toEqual({ id: expect.any(String), name: "Ana Souza", email, image: null });
  });

  it.each([
    ["sem cookie de sessão", new Headers()],
    ["com cookie ilegível", new Headers({ cookie: "better-auth.session_token=cookie-adulterado" })],
  ])("redireciona para /entrar %s", async (_case, headers) => {
    await expectRedirectToSignIn(requireSessionFromHeaders(headers));
  });

  it("redireciona para /entrar quando a sessão expirou", async () => {
    const { email, headers } = await createSignedInUser();
    await setSessionsExpiresAt(email, new Date(Date.now() - ONE_MINUTE_MS));

    await expectRedirectToSignIn(requireSessionFromHeaders(headers));
  });
});

describe("findSessionUser", () => {
  it("devolve o Usuário da sessão válida", async () => {
    const { email, headers } = await createSignedInUser();

    const user = await findSessionUser(headers);

    expect(user?.email).toBe(email);
  });

  it("devolve undefined para o visitante, sem redirecionar", async () => {
    expect(await findSessionUser(new Headers())).toBeUndefined();
  });

  // Server Component não grava cookie: se a leitura renovasse o banco, a rota não renovaria mais o cookie
  it("deixa a renovação da sessão vencida para a rota /auth/get-session, que renova o cookie", async () => {
    const { email, headers } = await createSignedInUser();
    await setSessionsExpiresAt(email, new Date(Date.now() + DUE_FOR_RENEWAL_MS));

    await findSessionUser(headers);
    const response = await getAuth().handler(new Request(`${process.env.BETTER_AUTH_URL}/auth/get-session`, { headers }));

    expect(response.headers.getSetCookie().join(";")).toContain("session_token");
  });
});

describe("revokeSession", () => {
  it("encerra a sessão na hora: o mesmo cookie deixa de valer", async () => {
    const { headers } = await createSignedInUser();

    await revokeSession(headers);

    await expectRedirectToSignIn(requireSessionFromHeaders(headers));
  });
});

// --- Funções auxiliares ---

const ONE_MINUTE_MS = 60 * 1000;
const MS_PER_DAY = 24 * 60 * ONE_MINUTE_MS;

// Validade de 30 dias renovada a cada dia: a 28 dias do fim, a sessão já passou do dia de renovar
const DUE_FOR_RENEWAL_MS = 28 * MS_PER_DAY;

// Grava a validade direto no banco, que é como se controla o relógio do Postgres
async function setSessionsExpiresAt(email: string, expiresAt: Date) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  await db
    .update(sessions)
    .set({ expiresAt })
    .where(eq(sessions.userId, user.id));
}
