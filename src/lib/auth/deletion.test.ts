import { eq, like } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  accounts,
  appointmentChanges,
  appointments,
  fileBlobs,
  files,
  focuses,
  folders,
  profilePhotos,
  profiles,
  sessions,
  stoods,
  stoodTags,
  tags,
  users,
  verifications,
  weeklyGoals,
} from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import { deleteUserWithCode, isDeletionCodeValid, requestUserDeletion } from "@/lib/auth/deletion";
import { findSessionUser, requireCurrentSessionFromHeaders } from "@/lib/auth/session";
import { createOtherSession, createSignedInUser, createUnverifiedUser, setSessionsCreatedAt, warmUpAuth } from "@/test/auth";
import { createFile, createFolder, createStood, createTag } from "@/test/db";
import { findLink, type SentEmail, stubResend } from "@/test/email";

beforeAll(warmUpAuth);

const MS_PER_DAY = 86_400_000;

describe("requestUserDeletion", () => {
  it("manda ao e-mail do Usuário o link da página de confirmar, aceitando o e-mail em maiúsculas", async () => {
    const { email, headers } = await createSignedInUser();
    const outbox = stubResend();

    const result = await requestUserDeletion(await requireCurrentSessionFromHeaders(headers), ` ${email.toUpperCase()} `);

    expect(result).toEqual({ ok: true });
    expect(outbox[0].to).toEqual([email]);
    expect(findLink(outbox[0])).toMatch(/\/perfil\/apagar\?codigo=[\w-]+$/);
  });

  it("guarda só o hash do código, com validade de 1 hora", async () => {
    const { userId, headers } = await createSignedInUser();
    const code = await requestCode(headers);

    const [row] = await findDeletionRows(userId);

    expect(row.value).not.toContain(code);
    expect(row.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(row.expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000);
  });

  it("recusa quando o e-mail digitado não é o do Usuário, sem mandar nada", async () => {
    const { headers } = await createSignedInUser();
    const outbox = stubResend();

    await expect(requestUserDeletion(await requireCurrentSessionFromHeaders(headers), "outra@stood.test")).resolves.toEqual({
      ok: false,
      reason: "email-diferente",
    });
    expect(outbox).toEqual([]);
  });

  it("recusa quando a Sessão tem mais de 1 dia", async () => {
    const { email, userId, headers } = await createSignedInUser();
    await setSessionsCreatedAt(userId, new Date(Date.now() - 2 * MS_PER_DAY));

    await expect(requestUserDeletion(await requireCurrentSessionFromHeaders(headers), email)).resolves.toEqual({
      ok: false,
      reason: "login-antigo",
    });
  });

  it("avisa quando o link não pode ser enviado, sem deixar código válido", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { email, userId, headers } = await createSignedInUser();
    vi.stubEnv("RESEND_API_KEY", "re_123456789_chave_de_teste");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));

    await expect(requestUserDeletion(await requireCurrentSessionFromHeaders(headers), email)).resolves.toEqual({
      ok: false,
      reason: "email-nao-enviado",
    });
    expect(await findDeletionRows(userId)).toEqual([]);
  });
});

describe("isDeletionCodeValid", () => {
  it("aceita o código do Usuário sem apagar nada nem gastar o código", async () => {
    const { userId, headers } = await createSignedInUser();
    const code = await requestCode(headers);

    expect(await isDeletionCodeValid(userId, code)).toBe(true);
    expect(await isDeletionCodeValid(userId, code)).toBe(true);
    expect(await findSessionUser(headers)).toBeDefined();
  });
});

describe("deleteUserWithCode", () => {
  it("apaga o Usuário com todos os Stoods e tudo o que é dele, sem tocar em outro", async () => {
    const other = await createSignedInUser();
    const otherStood = await createStood(other.userId, "Cálculo");
    const { userId, headers } = await createSignedInUser();
    await createOwnedContent(userId);
    const before = await countOwnedRows(userId);
    const code = await requestCode(headers);

    const result = await deleteUserWithCode(userId, code);

    expect(result).toEqual({ ok: true });
    expect(Object.entries(before).filter(([, count]) => count === 0)).toEqual([]);
    expect(Object.entries(await countOwnedRows(userId)).filter(([, count]) => count > 0)).toEqual([]);
    expect(await findDeletionRows(userId)).toEqual([]);
    expect(await db.select({ id: stoods.id }).from(stoods).where(eq(stoods.ownerId, other.userId))).toEqual([{ id: otherStood.id }]);
  });

  it("apaga o link de trocar a senha e o pedido de ligar Conta em andamento, só os dele", async () => {
    const other = await createSignedInUser();
    await createPendingVerifications(other);
    const user = await createSignedInUser();
    await createPendingVerifications(user);

    await deleteUserWithCode(user.userId, await requestCode(user.headers));

    expect(await countVerifications(user.userId)).toBe(0);
    expect(await countVerifications(other.userId)).toBe(2);
  });

  it("encerra todas as Sessões, inclusive a de outro navegador", async () => {
    const { email, userId, headers } = await createSignedInUser();
    const otherHeaders = await createOtherSession(email);

    await deleteUserWithCode(userId, await requestCode(headers));

    expect(await findSessionUser(headers)).toBeUndefined();
    expect(await findSessionUser(otherHeaders)).toBeUndefined();
  });

  it("deixa o mesmo e-mail se cadastrar de novo", async () => {
    const { email, userId, headers } = await createSignedInUser();
    await deleteUserWithCode(userId, await requestCode(headers));

    await expect(createUnverifiedUser(email)).resolves.toEqual({ email });
  });

  it("só o primeiro de dois cliques ao mesmo tempo usa o código", async () => {
    const { userId, headers } = await createSignedInUser();
    const code = await requestCode(headers);

    const results = await Promise.all([deleteUserWithCode(userId, code), deleteUserWithCode(userId, code)]);

    expect(results).toContainEqual({ ok: true });
    expect(results).toContainEqual({ ok: false, reason: "link-invalido" });
  });

  it("pedir outro link invalida o anterior", async () => {
    const { userId, headers } = await createSignedInUser();
    const firstCode = await requestCode(headers);
    await requestCode(headers);

    await expect(deleteUserWithCode(userId, firstCode)).resolves.toEqual({ ok: false, reason: "link-invalido" });
    expect(await findSessionUser(headers)).toBeDefined();
  });

  it("recusa o link vencido", async () => {
    const { userId, headers } = await createSignedInUser();
    const code = await requestCode(headers);
    await db.update(verifications).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(verifications.identifier, buildIdentifier(userId)));

    await expect(deleteUserWithCode(userId, code)).resolves.toEqual({ ok: false, reason: "link-invalido" });
  });

  it("recusa o código de outro Usuário e um código inventado", async () => {
    const other = await createSignedInUser();
    const otherCode = await requestCode(other.headers);
    const { userId } = await createSignedInUser();

    for (const code of [otherCode, "codigo-inventado", ""]) {
      await expect(deleteUserWithCode(userId, code)).resolves.toEqual({ ok: false, reason: "link-invalido" });
    }
    expect(await findSessionUser(other.headers)).toBeDefined();
  });
});

// --- Funções auxiliares ---

function buildIdentifier(userId: string) {
  return `delete-user:${userId}`;
}

async function requestCode(headers: Headers) {
  const current = await requireCurrentSessionFromHeaders(headers);
  const outbox = stubResend();
  await requestUserDeletion(current, current.user.email);
  return buildCode(outbox[0]);
}

function buildCode(email: SentEmail) {
  return new URL(findLink(email)!).searchParams.get("codigo")!;
}

function findDeletionRows(userId: string) {
  return db
    .select({ value: verifications.value, expiresAt: verifications.expiresAt })
    .from(verifications)
    .where(eq(verifications.identifier, buildIdentifier(userId)));
}

// Uma linha de cada coisa que o Usuário pode ter, inclusive um Foco em andamento
async function createOwnedContent(userId: string) {
  const stood = await createStood(userId, "Cálculo");
  await createStood(userId, "Física");
  const folder = await createFolder(userId, stood.id, { name: "Aulas" });
  await createFile(userId, stood.id, { type: "note", name: "Resumo", content: "# Limites", folderId: folder.id });
  const image = await createFile(userId, stood.id, { type: "image", name: "Gráfico" });
  await db.insert(fileBlobs).values({ fileId: image.id, ownerId: userId, mimeType: "image/png", data: Buffer.from("bytes") });
  await createTag(userId, "Prova", [stood.id]);
  await db.insert(focuses).values({ ownerId: userId, stoodId: stood.id, startedAt: new Date(), durationMinutes: 25 });
  await db.insert(weeklyGoals).values({ ownerId: userId, minutes: 60 });
  await db.insert(profiles).values({ ownerId: userId, nickname: "Johny", mood: "calm", moodDay: "2026-11-24" });
  await db.insert(profilePhotos).values({ ownerId: userId, data: Buffer.from([0xff, 0xd8, 0xff]) });
  const [appointment] = await db
    .insert(appointments)
    .values({ ownerId: userId, stoodId: stood.id, title: "Simulado", day: "2026-11-28", recurrence: "weekly", weekdays: [6] })
    .returning({ id: appointments.id });
  await db.insert(appointmentChanges).values({ ownerId: userId, appointmentId: appointment.id, originalDay: "2026-12-05", isDeleted: true });
}

// A biblioteca guarda os dois sem FK para o Usuário, e o de ligar Conta traz o e-mail dele
async function createPendingVerifications({ email, headers }: { email: string; headers: Headers }) {
  stubResend();
  await getAuth().api.requestPasswordReset({ body: { email, redirectTo: "/redefinir-senha" } });
  await getAuth().api.linkSocialAccount({ body: { provider: "google", callbackURL: "/perfil", errorCallbackURL: "/perfil" }, headers });
}

async function countVerifications(userId: string) {
  return db.$count(verifications, like(verifications.value, `%${userId}%`));
}

async function countOwnedRows(userId: string) {
  return {
    users: await db.$count(users, eq(users.id, userId)),
    accounts: await db.$count(accounts, eq(accounts.userId, userId)),
    sessions: await db.$count(sessions, eq(sessions.userId, userId)),
    stoods: await db.$count(stoods, eq(stoods.ownerId, userId)),
    folders: await db.$count(folders, eq(folders.ownerId, userId)),
    files: await db.$count(files, eq(files.ownerId, userId)),
    fileBlobs: await db.$count(fileBlobs, eq(fileBlobs.ownerId, userId)),
    stoodTags: await db.$count(stoodTags, eq(stoodTags.ownerId, userId)),
    appointmentChanges: await db.$count(appointmentChanges, eq(appointmentChanges.ownerId, userId)),
    tags: await db.$count(tags, eq(tags.ownerId, userId)),
    focuses: await db.$count(focuses, eq(focuses.ownerId, userId)),
    weeklyGoals: await db.$count(weeklyGoals, eq(weeklyGoals.ownerId, userId)),
    appointments: await db.$count(appointments, eq(appointments.ownerId, userId)),
    profiles: await db.$count(profiles, eq(profiles.ownerId, userId)),
    profilePhotos: await db.$count(profilePhotos, eq(profilePhotos.ownerId, userId)),
  };
}
