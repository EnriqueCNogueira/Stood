import { beforeAll, describe, expect, it } from "vitest";
import { getSessions, revokeOtherSessions, revokeOwnedSession } from "@/lib/auth/owned-sessions";
import { findSessionUser, requireCurrentSessionFromHeaders } from "@/lib/auth/session";
import { createOtherSession, createSignedInUser, setSessionsExpiresAt, warmUpAuth } from "@/test/auth";

beforeAll(warmUpAuth);

const FIREFOX_ON_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0";

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
