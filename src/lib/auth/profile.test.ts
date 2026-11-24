import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import { REQUEST_DELETION_PATH } from "@/lib/auth/destination";
import { MAX_USER_NAME_LENGTH } from "@/lib/auth/name";
import { getSessions, revokeOtherSessions, revokeOwnedSession, updateUserName } from "@/lib/auth/profile";
import { findSessionUser, requireCurrentSessionFromHeaders } from "@/lib/auth/session";
import {
  buildCookieHeaders,
  buildUniqueEmail,
  buildUniqueProviderAccountId,
  createOtherSession,
  createSignedInUser,
  setSessionsExpiresAt,
  TEST_PASSWORD,
  warmUpAuth,
} from "@/test/auth";
import { stubResend } from "@/test/email";
import { signInWithProvider } from "@/test/providers";

beforeAll(warmUpAuth);

const FIREFOX_ON_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0";
const NEW_PASSWORD = "Senha-nova-456";

describe("updateUserName", () => {
  it("muda o nome aparando as pontas, e o login pelo provedor não o troca de volta", async () => {
    const email = buildUniqueEmail();
    const providerAccountId = buildUniqueProviderAccountId();
    await signInWithProvider("google", email, { providerAccountId });
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

    const result = await updateUserName(user.id, "  Aninha  ");
    const response = await signInWithProvider("google", email, { providerAccountId });

    expect(result).toEqual({ ok: true, name: "Aninha" });
    expect((await findSessionUser(buildCookieHeaders(response.headers)))?.name).toBe("Aninha");
  });

  it.each([
    ["vazio", "   ", "nome-vazio"],
    ["com 81 caracteres", "a".repeat(MAX_USER_NAME_LENGTH + 1), "nome-longo"],
  ])("recusa o nome %s e mantém o atual", async (_case, name, reason) => {
    const { userId, headers } = await createSignedInUser();

    await expect(updateUserName(userId, name)).resolves.toEqual({ ok: false, reason });
    expect((await findSessionUser(headers))?.name).toBe("Ana Souza");
  });
});

describe("cadastro por e-mail e senha: nome", () => {
  it("grava o nome aparado", async () => {
    const email = buildUniqueEmail();

    await signUp(email, "  Ana  ");

    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.email, email));
    expect(user.name).toBe("Ana");
  });

  it.each(["   ", "a".repeat(MAX_USER_NAME_LENGTH + 1)])("recusa o nome %j, com o código que a tela traduz", async (name) => {
    await expect(signUp(buildUniqueEmail(), name)).rejects.toMatchObject({ body: { code: "USER_NAME_INVALID" } });
  });
});

describe("troca de senha", () => {
  it("troca a senha, encerra as outras Sessões, mantém o Usuário conectado e avisa por e-mail", async () => {
    const { email, headers } = await createSignedInUser();
    const otherHeaders = await createOtherSession(email);
    const outbox = stubResend();

    const response = await changePassword(headers, TEST_PASSWORD, NEW_PASSWORD);

    expect((await findSessionUser(buildCookieHeaders(response.headers)))?.email).toBe(email);
    expect(await findSessionUser(otherHeaders)).toBeUndefined();
    expect(await createOtherSession(email, "", NEW_PASSWORD)).toBeDefined();
    expect(outbox).toMatchObject([{ to: [email], subject: "A senha do seu Stood mudou" }]);
  });

  it("recusa a senha atual errada, sem encerrar Sessões nem avisar", async () => {
    const { email, headers } = await createSignedInUser();
    const otherHeaders = await createOtherSession(email);
    const outbox = stubResend();

    await expect(changePassword(headers, "Senha-errada-123", NEW_PASSWORD)).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD" } });
    expect(await findSessionUser(otherHeaders)).toBeDefined();
    expect(outbox).toEqual([]);
  });

  it("mantém a senha trocada quando o aviso não pode ser enviado", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { email, headers } = await createSignedInUser();
    vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));

    await changePassword(headers, TEST_PASSWORD, NEW_PASSWORD);

    expect(await createOtherSession(email, "", NEW_PASSWORD)).toBeDefined();
  });
});

describe("limite de tentativas", () => {
  it.each([
    ["trocar a senha", "/change-password", { currentPassword: "Senha-errada-123", newPassword: NEW_PASSWORD }],
    ["pedir o link de apagar", REQUEST_DELETION_PATH, { email: "outra@stood.test" }],
  ])("recusa a quarta tentativa de %s em 10 segundos", async (_case, path, body) => {
    const { headers } = await createSignedInUser();
    const handle = await buildProductionHandler();

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt++) statuses.push((await handle(headers, path, body)).status);

    expect(statuses.map((status) => status === 429)).toEqual([false, false, false, true]);
  });
});

describe("getSessions", () => {
  it("devolve as Sessões do Usuário, a atual primeiro, com navegador e sistema e sem token", async () => {
    await createSignedInUser();
    const { email, headers } = await createSignedInUser();
    await createOtherSession(email, FIREFOX_ON_LINUX);

    const sessions = await getSessions(await requireCurrentSessionFromHeaders(headers));

    expect(sessions).toEqual([
      { id: expect.any(String), browser: "Navegador desconhecido", system: null, lastUsedAt: expect.any(Date), isCurrent: true },
      { id: expect.any(String), browser: "Firefox", system: "Linux", lastUsedAt: expect.any(Date), isCurrent: false },
    ]);
  });

  it("não devolve a Sessão vencida", async () => {
    const { email, headers } = await createSignedInUser();
    const current = await requireCurrentSessionFromHeaders(headers);
    await setSessionsExpiresAt(email, new Date(Date.now() - 60_000));

    expect(await getSessions(current)).toEqual([]);
  });
});

describe("revokeOwnedSession", () => {
  it("encerra a Sessão pedida e mantém a atual", async () => {
    const { email, headers } = await createSignedInUser();
    const otherHeaders = await createOtherSession(email);
    const current = await requireCurrentSessionFromHeaders(headers);
    const other = (await getSessions(current)).find((session) => !session.isCurrent)!;

    await expect(revokeOwnedSession(current, other.id)).resolves.toEqual({ ok: true });
    expect(await findSessionUser(otherHeaders)).toBeUndefined();
    expect(await findSessionUser(headers)).toBeDefined();
  });

  it("recusa a Sessão de outro Usuário como inexistente", async () => {
    const other = await createSignedInUser();
    const otherSession = await requireCurrentSessionFromHeaders(other.headers);
    const { headers } = await createSignedInUser();

    await expect(revokeOwnedSession(await requireCurrentSessionFromHeaders(headers), otherSession.session.id)).resolves.toEqual({
      ok: false,
      reason: "sessao-nao-encontrada",
    });
    expect(await findSessionUser(other.headers)).toBeDefined();
  });

  it("recusa a Sessão atual, que se encerra por Sair, e um id inválido", async () => {
    const { headers } = await createSignedInUser();
    const current = await requireCurrentSessionFromHeaders(headers);

    for (const id of [current.session.id, "abc"]) {
      await expect(revokeOwnedSession(current, id)).resolves.toEqual({ ok: false, reason: "sessao-nao-encontrada" });
    }
  });
});

describe("revokeOtherSessions", () => {
  it("encerra todas as outras do Usuário e nenhuma de outro", async () => {
    const other = await createSignedInUser();
    const { email, headers } = await createSignedInUser();
    const otherHeaders = [await createOtherSession(email), await createOtherSession(email)];

    await revokeOtherSessions(await requireCurrentSessionFromHeaders(headers));

    expect(await Promise.all(otherHeaders.map(findSessionUser))).toEqual([undefined, undefined]);
    expect(await findSessionUser(headers)).toBeDefined();
    expect(await findSessionUser(other.headers)).toBeDefined();
  });
});

// --- Funções auxiliares ---

function signUp(email: string, name: string) {
  return getAuth().api.signUpEmail({ body: { name, email, password: TEST_PASSWORD } });
}

function changePassword(headers: Headers, currentPassword: string, newPassword: string) {
  return getAuth().api.changePassword({ body: { currentPassword, newPassword }, headers, returnHeaders: true });
}

// A lib só limita tentativas em produção, então o caso monta uma instância nova como se estivesse nela
async function buildProductionHandler() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");
  vi.resetModules();
  const { getAuth: getProductionAuth } = await import("@/lib/auth/auth");
  const ip = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
  return (headers: Headers, path: string, body: object) =>
    getProductionAuth().handler(
      new Request(`${process.env.BETTER_AUTH_URL}/auth${path}`, {
        method: "POST",
        headers: {
          cookie: headers.get("cookie")!,
          "content-type": "application/json",
          origin: process.env.BETTER_AUTH_URL!,
          "x-forwarded-for": ip,
        },
        body: JSON.stringify(body),
      }),
    );
}
