import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { profilePhotos, profiles, users } from "@/db/schema";
import { MAX_USER_NAME_LENGTH } from "@/lib/auth/name";
import { deletePhoto, findPhoto, getProfile, updateMood, updateProfileDetails, upsertPhoto } from "@/lib/profile/profile";
import { MAX_BIO_LENGTH, MAX_NICKNAME_LENGTH, MAX_PHOTO_BYTES } from "@/lib/profile/rules";
import { createUser } from "@/test/db";

// Terça-feira, 24/11/2026, 10h em Brasília (UTC-3)
const NOW = new Date("2026-11-24T13:00:00.000Z");
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const OTHER_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);
const CHECK_VIOLATION = "23514";

describe("getProfile", () => {
  it("devolve o Perfil vazio de quem nunca mexeu nele", async () => {
    expect(await getProfile(await createUser(), NOW)).toEqual({ nickname: null, bio: null, mood: null, photoVersion: null });
  });

  it("não devolve o que é de outro Usuário", async () => {
    const otherId = await createUser();
    await updateProfileDetails(otherId, { name: "Bia", nickname: "Bibi", bio: "Física" });
    await updateMood(otherId, "calm", NOW);
    await upsertPhoto(otherId, JPEG, NOW);

    expect(await getProfile(await createUser(), NOW)).toEqual({ nickname: null, bio: null, mood: null, photoVersion: null });
  });
});

describe("updateProfileDetails", () => {
  it("grava nome, Apelido e Bio aparados, juntos", async () => {
    const userId = await createUser();

    const result = await updateProfileDetails(userId, { name: " João ", nickname: " Johny ", bio: " Computação na Unifesp " });

    expect(result).toEqual({ ok: true, name: "João", nickname: "Johny", bio: "Computação na Unifesp" });
    expect(await getProfile(userId, NOW)).toMatchObject({ nickname: "Johny", bio: "Computação na Unifesp" });
    expect(await findName(userId)).toBe("João");
  });

  it("apaga Apelido e Bio quando vêm vazios, sem mexer no Humor", async () => {
    const userId = await createUser();
    await updateProfileDetails(userId, { name: "João", nickname: "Johny", bio: "Computação" });
    await updateMood(userId, "motivation", NOW);

    await updateProfileDetails(userId, { name: "João", nickname: "", bio: " " });

    expect(await getProfile(userId, NOW)).toMatchObject({ nickname: null, bio: null, mood: { id: "motivation" } });
  });

  it("aceita um Apelido igual ao de outro Usuário", async () => {
    await updateProfileDetails(await createUser(), { name: "Ana", nickname: "Johny", bio: "" });

    await expect(updateProfileDetails(await createUser(), { name: "João", nickname: "Johny", bio: "" })).resolves.toMatchObject({ ok: true });
  });

  it.each([
    ["nome vazio", { name: " " }, "nome-vazio"],
    ["nome longo", { name: "a".repeat(MAX_USER_NAME_LENGTH + 1) }, "nome-longo"],
    ["Apelido longo", { nickname: "a".repeat(MAX_NICKNAME_LENGTH + 1) }, "apelido-longo"],
    ["Bio longa", { bio: "a".repeat(MAX_BIO_LENGTH + 1) }, "bio-longa"],
    ["Bio com quebra de linha", { bio: "a\nb" }, "bio-com-quebra"],
  ])("recusa %s sem gravar nenhum dos três", async (_case, change, reason) => {
    const userId = await createUser();
    await updateProfileDetails(userId, { name: "João", nickname: "Johny", bio: "Computação" });

    const result = await updateProfileDetails(userId, { name: "Outro", nickname: "Outro", bio: "Outra", ...change });

    expect(result).toEqual({ ok: false, reason });
    expect(await findName(userId)).toBe("João");
    expect(await getProfile(userId, NOW)).toMatchObject({ nickname: "Johny", bio: "Computação" });
  });
});

describe("updateMood", () => {
  it("marca, troca e tira o Humor, sem mexer no Apelido", async () => {
    const userId = await createUser();
    await updateProfileDetails(userId, { name: "João", nickname: "Johny", bio: "" });

    await updateMood(userId, "motivation", NOW);
    expect(await getProfile(userId, NOW)).toMatchObject({ mood: { id: "motivation", emoji: "😎", label: "Motivação" }, nickname: "Johny" });

    await updateMood(userId, "tiredness", NOW);
    expect((await getProfile(userId, NOW)).mood?.id).toBe("tiredness");

    await updateMood(userId, null, NOW);
    expect((await getProfile(userId, NOW)).mood).toBeNull();
  });

  it("vale até o fim do dia de Brasília", async () => {
    const userId = await createUser();
    await updateMood(userId, "calm", NOW);

    // 23h59 e 0h de Brasília
    expect((await getProfile(userId, new Date("2026-11-25T02:59:59.000Z"))).mood?.id).toBe("calm");
    expect((await getProfile(userId, new Date("2026-11-25T03:00:00.000Z"))).mood).toBeNull();
  });

  it("recusa o que não está na lista e mantém o atual", async () => {
    const userId = await createUser();
    await updateMood(userId, "calm", NOW);

    await expect(updateMood(userId, "raiva", NOW)).resolves.toEqual({ ok: false, reason: "humor-invalido" });
    expect((await getProfile(userId, NOW)).mood?.id).toBe("calm");
  });

  it("tira o registro do banco, sem guardar histórico", async () => {
    const userId = await createUser();
    await updateMood(userId, "calm", NOW);
    await updateMood(userId, null, NOW);

    const [row] = await db.select({ mood: profiles.mood, moodDay: profiles.moodDay }).from(profiles).where(eq(profiles.ownerId, userId));
    expect(row).toEqual({ mood: null, moodDay: null });
  });
});

describe("upsertPhoto", () => {
  it("grava e troca a Foto, e o endereço muda junto", async () => {
    const userId = await createUser();
    await upsertPhoto(userId, JPEG, NOW);
    const first = (await getProfile(userId, NOW)).photoVersion;

    await upsertPhoto(userId, OTHER_JPEG, new Date(NOW.getTime() + 1000));

    expect(new Uint8Array((await findPhoto(userId))!)).toEqual(OTHER_JPEG);
    expect((await getProfile(userId, NOW)).photoVersion).not.toBe(first);
  });

  it.each([
    ["vazia", new Uint8Array(0), "foto-vazia"],
    ["acima do limite", new Uint8Array([...JPEG, ...new Array(MAX_PHOTO_BYTES).fill(0)]), "foto-grande"],
    ["que não é JPEG", new TextEncoder().encode("texto"), "foto-invalida"],
  ])("recusa a Foto %s e mantém a atual", async (_case, bytes, reason) => {
    const userId = await createUser();
    await upsertPhoto(userId, JPEG, NOW);

    await expect(upsertPhoto(userId, bytes, NOW)).resolves.toEqual({ ok: false, reason });
    expect(new Uint8Array((await findPhoto(userId))!)).toEqual(JPEG);
  });
});

describe("deletePhoto", () => {
  it("remove só a Foto do Usuário", async () => {
    const otherId = await createUser();
    await upsertPhoto(otherId, OTHER_JPEG, NOW);
    const userId = await createUser();
    await upsertPhoto(userId, JPEG, NOW);

    await deletePhoto(userId);

    expect(await findPhoto(userId)).toBeUndefined();
    expect((await getProfile(userId, NOW)).photoVersion).toBeNull();
    expect(new Uint8Array((await findPhoto(otherId))!)).toEqual(OTHER_JPEG);
  });
});

describe("tabelas do Perfil", () => {
  it.each([
    ["Apelido com espaço nas pontas", { nickname: " Johny" }, "profiles_nickname_check"],
    ["Bio com quebra de linha", { bio: "a\nb" }, "profiles_bio_check"],
    ["Humor fora da lista", { mood: "raiva" as never, moodDay: "2026-11-24" }, "profiles_mood_check"],
    ["Humor sem dia", { mood: "calm" as const }, "profiles_mood_day_check"],
  ])("recusa no banco %s", async (_case, values, constraint) => {
    const ownerId = await createUser();

    await expect(db.insert(profiles).values({ ownerId, ...values })).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION, constraint } });
  });

  it.each([
    ["que não é JPEG", Buffer.from("texto")],
    ["acima do limite", Buffer.concat([Buffer.from(JPEG), Buffer.alloc(MAX_PHOTO_BYTES)])],
  ])("recusa no banco a Foto %s", async (_case, data) => {
    const ownerId = await createUser();

    await expect(db.insert(profilePhotos).values({ ownerId, data })).rejects.toMatchObject({
      cause: { code: CHECK_VIOLATION, constraint: "profile_photos_data_check" },
    });
  });
});

// --- Funções auxiliares ---

async function findName(userId: string) {
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  return user?.name;
}
