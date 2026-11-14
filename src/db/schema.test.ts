import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { type FileType, files, folders, stoods, users } from "@/db/schema";
import { createFile, createFolder, createStood, createUser } from "@/test/db";

// Códigos de erro do Postgres conferidos nas recusas
const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const INVALID_TRANSACTION_STATE = "25000";

const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;
const VALID_VIDEO_ID = "dQw4w9WgXcQ";

describe("isolamento por dono", () => {
  it("recusa Pasta no Stood de outro Usuário", async () => {
    const { stood: otherStood } = await createUserWithStood();
    const { userId } = await createUserWithStood();

    await expectViolation(
      db.insert(folders).values({ ownerId: userId, stoodId: otherStood.id, name: "Limites" }),
      FOREIGN_KEY_VIOLATION,
      "folders_stood_id_owner_id_stoods_fk",
    );
  });

  it("recusa Pasta dentro da Pasta de outro Usuário", async () => {
    const other = await createUserWithStood();
    const otherFolder = await createFolder(other.userId, other.stood.id);
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      db.insert(folders).values({ ownerId: userId, stoodId: stood.id, parentId: otherFolder.id, name: "Limites" }),
      FOREIGN_KEY_VIOLATION,
      "folders_parent_id_folders_fk",
    );
  });

  it("recusa Arquivo no Stood de outro Usuário", async () => {
    const { stood: otherStood } = await createUserWithStood();
    const { userId } = await createUserWithStood();

    await expectViolation(
      db.insert(files).values({ ownerId: userId, stoodId: otherStood.id, ...buildNote() }),
      FOREIGN_KEY_VIOLATION,
      "files_stood_id_owner_id_stoods_fk",
    );
  });

  it("recusa Arquivo dentro da Pasta de outro Usuário", async () => {
    const other = await createUserWithStood();
    const otherFolder = await createFolder(other.userId, other.stood.id);
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      db.insert(files).values({ ownerId: userId, stoodId: stood.id, folderId: otherFolder.id, ...buildNote() }),
      FOREIGN_KEY_VIOLATION,
      "files_folder_id_folders_fk",
    );
  });
});

describe("mesmo Stood", () => {
  it("recusa Pasta dentro de uma Pasta de outro Stood do mesmo Usuário", async () => {
    const { userId, stood } = await createUserWithStood();
    const otherStood = await createStood(userId, "Física");
    const otherFolder = await createFolder(userId, otherStood.id);

    await expectViolation(
      db.insert(folders).values({ ownerId: userId, stoodId: stood.id, parentId: otherFolder.id, name: "Limites" }),
      FOREIGN_KEY_VIOLATION,
      "folders_parent_id_folders_fk",
    );
  });

  it("recusa Arquivo dentro de uma Pasta de outro Stood do mesmo Usuário", async () => {
    const { userId, stood } = await createUserWithStood();
    const otherStood = await createStood(userId, "Física");
    const otherFolder = await createFolder(userId, otherStood.id);

    await expectViolation(
      db.insert(files).values({ ownerId: userId, stoodId: stood.id, folderId: otherFolder.id, ...buildNote() }),
      FOREIGN_KEY_VIOLATION,
      "files_folder_id_folders_fk",
    );
  });
});

describe("nome único sem diferenciar maiúsculas", () => {
  it("aceita Stoods com o mesmo nome de Usuários diferentes", async () => {
    await createUserWithStood();
    const userId = await createUser();

    await expect(createStood(userId, "CÁLCULO")).resolves.toBeDefined();
  });

  it("recusa dois Stoods do mesmo Usuário com o mesmo nome", async () => {
    const { userId } = await createUserWithStood();

    await expectViolation(createStood(userId, "CÁLCULO"), UNIQUE_VIOLATION, "stoods_owner_id_name_unique");
  });

  it("recusa duas Pastas irmãs com o mesmo nome na raiz do Stood", async () => {
    const { userId, stood } = await createUserWithStood();
    await createFolder(userId, stood.id, { name: "Limites" });

    await expectViolation(
      createFolder(userId, stood.id, { name: "LIMITES" }),
      UNIQUE_VIOLATION,
      "folders_stood_id_parent_id_name_unique",
    );
  });

  it("aceita Pastas com o mesmo nome em Pastas diferentes", async () => {
    const { userId, stood } = await createUserWithStood();
    const parent = await createFolder(userId, stood.id, { name: "Aulas" });
    await createFolder(userId, stood.id, { name: "Limites" });

    await expect(createFolder(userId, stood.id, { name: "LIMITES", parentId: parent.id })).resolves.toBeDefined();
  });

  it("recusa dois Arquivos do mesmo tipo com o mesmo nome na raiz do Stood", async () => {
    const { userId, stood } = await createUserWithStood();
    await createFile(userId, stood.id, buildNote("Resumo"));

    await expectViolation(
      createFile(userId, stood.id, buildNote("RESUMO")),
      UNIQUE_VIOLATION,
      "files_stood_id_folder_id_type_name_unique",
    );
  });

  it("aceita Arquivos com o mesmo nome e tipos diferentes na mesma Pasta", async () => {
    const { userId, stood } = await createUserWithStood();
    await createFile(userId, stood.id, buildNote("Resumo"));

    await expect(
      createFile(userId, stood.id, { type: "drawing", name: "RESUMO", content: "{}" }),
    ).resolves.toBeDefined();
  });

  it("aceita Arquivos do mesmo tipo com o mesmo nome em Pastas diferentes", async () => {
    const { userId, stood } = await createUserWithStood();
    const folder = await createFolder(userId, stood.id);
    await createFile(userId, stood.id, buildNote("Resumo"));

    await expect(
      createFile(userId, stood.id, { ...buildNote("RESUMO"), folderId: folder.id }),
    ).resolves.toBeDefined();
  });
});

describe("nome válido", () => {
  const invalidNames = [
    ["vazio", ""],
    ["com /", "Aulas/Limites"],
    ["com \\", "Aulas\\Limites"],
    ["com espaço no início", " Limites"],
    ["com espaço no fim", "Limites "],
    ["com 51 caracteres", "a".repeat(MAX_NAME_LENGTH + 1)],
  ];

  // As três tabelas usam o mesmo CHECK: as entradas são conferidas em Stood, e Pasta e Arquivo só provam que ele foi aplicado
  it.each(invalidNames)("recusa nome de Stood %s", async (_case, name) => {
    const { userId } = await createUserWithStood();

    await expectViolation(createStood(userId, name), CHECK_VIOLATION, "stoods_name_check");
  });

  it("recusa nome de Pasta inválido", async () => {
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      createFolder(userId, stood.id, { name: "Aulas/Limites" }),
      CHECK_VIOLATION,
      "folders_name_check",
    );
  });

  it("recusa nome de Arquivo inválido", async () => {
    const { userId, stood } = await createUserWithStood();

    await expectViolation(createFile(userId, stood.id, buildNote("Aulas/Limites")), CHECK_VIOLATION, "files_name_check");
  });

  it("aceita nome de 50 caracteres em Stood, Pasta e Arquivo", async () => {
    const name = "a".repeat(MAX_NAME_LENGTH);
    const { userId } = await createUserWithStood();
    const stood = await createStood(userId, name);

    await expect(
      Promise.all([createFolder(userId, stood.id, { name }), createFile(userId, stood.id, buildNote(name))]),
    ).resolves.toHaveLength(2);
  });
});

describe("descrição do Stood", () => {
  it("aceita descrição de 200 caracteres", async () => {
    const userId = await createUser();

    await expect(
      db.insert(stoods).values({ ownerId: userId, name: "Cálculo", description: "a".repeat(MAX_DESCRIPTION_LENGTH) }),
    ).resolves.toBeDefined();
  });

  it("recusa descrição de 201 caracteres", async () => {
    const userId = await createUser();

    await expectViolation(
      db.insert(stoods).values({ ownerId: userId, name: "Cálculo", description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1) }),
      CHECK_VIOLATION,
      "stoods_description_check",
    );
  });
});

describe("tipo e conteúdo do Arquivo", () => {
  it("recusa tipo fora da lista", async () => {
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      createFile(userId, stood.id, { type: "slides" as FileType, name: "Aula 1", content: null }),
      CHECK_VIOLATION,
      "files_type_check",
    );
  });

  it.each<FileType>(["note", "drawing", "video"])("recusa %s sem conteúdo", async (type) => {
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      createFile(userId, stood.id, { type, name: "Aula 1", content: null }),
      CHECK_VIOLATION,
      "files_content_check",
    );
  });

  it.each<FileType>(["image", "pdf"])("recusa %s com conteúdo no banco", async (type) => {
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      createFile(userId, stood.id, { type, name: "Aula 1", content: "binário" }),
      CHECK_VIOLATION,
      "files_content_check",
    );
  });

  it("aceita Nota com texto vazio", async () => {
    const { userId, stood } = await createUserWithStood();

    await expect(createFile(userId, stood.id, { type: "note", name: "Aula 1", content: "" })).resolves.toBeDefined();
  });

  it("aceita Vídeo com id do YouTube", async () => {
    const { userId, stood } = await createUserWithStood();

    await expect(
      createFile(userId, stood.id, { type: "video", name: "Aula 1", content: VALID_VIDEO_ID }),
    ).resolves.toBeDefined();
  });

  it.each([
    ["curto demais", "dQw4w9WgXc"],
    ["longo demais", "dQw4w9WgXcQQ"],
    ["com caractere fora do formato", "dQw4w9WgX!Q"],
    ["como link", "https://youtu.be/dQw4w9WgXcQ"],
  ])("recusa Vídeo com id %s", async (_case, content) => {
    const { userId, stood } = await createUserWithStood();

    await expectViolation(
      createFile(userId, stood.id, { type: "video", name: "Aula 1", content }),
      CHECK_VIOLATION,
      "files_video_content_check",
    );
  });
});

describe("ciclo de Pastas", () => {
  it("recusa criar Pasta como pai de si mesma", async () => {
    const { userId, stood } = await createUserWithStood();
    const id = crypto.randomUUID();

    await expectViolation(createFolder(userId, stood.id, { id, parentId: id }), CHECK_VIOLATION, "folders_parent_id_check");
  });

  it("recusa mover Pasta para dentro de si mesma", async () => {
    const { userId, stood } = await createUserWithStood();
    const folder = await createFolder(userId, stood.id);

    await expectViolation(updateFolderParent(db, folder.id, folder.id), CHECK_VIOLATION, "folders_parent_cycle_check");
  });

  it("recusa mover Pasta para dentro de uma descendente", async () => {
    const { userId, stood } = await createUserWithStood();
    const { root, grandchild } = await createFolderChain(userId, stood.id);

    await expectViolation(updateFolderParent(db, root.id, grandchild.id), CHECK_VIOLATION, "folders_parent_cycle_check");
  });

  it("aceita mover Pasta para uma Pasta que não é descendente", async () => {
    const { userId, stood } = await createUserWithStood();
    const { grandchild, root } = await createFolderChain(userId, stood.id);
    const sibling = await createFolder(userId, stood.id, { name: "Exercícios" });

    await updateFolderParent(db, grandchild.id, sibling.id);
    await updateFolderParent(db, root.id, sibling.id);

    const moved = await db.select({ parentId: folders.parentId }).from(folders).where(eq(folders.id, root.id));
    expect(moved).toEqual([{ parentId: sibling.id }]);
  });

  it("recusa mover Pasta em transação REPEATABLE READ", async () => {
    const { userId, stood } = await createUserWithStood();
    const first = await createFolder(userId, stood.id, { name: "Aulas" });
    const second = await createFolder(userId, stood.id, { name: "Exercícios" });

    await expect(
      db.transaction((tx) => updateFolderParent(tx, first.id, second.id), { isolationLevel: "repeatable read" }),
    ).rejects.toMatchObject({ cause: { code: INVALID_TRANSACTION_STATE } });
  });

  it("recusa um de dois movimentos cruzados em transações simultâneas", async () => {
    const { userId, stood } = await createUserWithStood();
    const first = await createFolder(userId, stood.id, { name: "Aulas" });
    const second = await createFolder(userId, stood.id, { name: "Exercícios" });
    const firstConnection = await db.$client.connect();
    const secondConnection = await db.$client.connect();

    try {
      const secondPid = await getBackendPid(secondConnection);
      await firstConnection.query("begin");
      await secondConnection.query("begin");
      await updateFolderParent(drizzle(firstConnection), first.id, second.id);

      // A segunda transação para na trava do Stood até a primeira confirmar
      const secondMove = trackMove(updateFolderParent(drizzle(secondConnection), second.id, first.id));
      await waitUntilBlockedOrSettled(secondPid, secondMove);
      await firstConnection.query("commit");
      const secondOutcome = await secondMove.outcome;
      await secondConnection.query("rollback");

      expect(secondOutcome).toMatchObject({
        ok: false,
        error: { cause: { code: CHECK_VIOLATION, constraint: "folders_parent_cycle_check" } },
      });
    } finally {
      firstConnection.release(true);
      secondConnection.release(true);
    }
  });
});

describe("cascata", () => {
  it("apagar Pasta apaga as Pastas descendentes e os Arquivos dentro delas", async () => {
    const { userId, stood } = await createUserWithStood();
    const { root, child, grandchild } = await createFolderChain(userId, stood.id);
    const file = await createFile(userId, stood.id, { ...buildNote(), folderId: grandchild.id });

    await db.delete(folders).where(eq(folders.id, root.id));

    await expectRemoved([child.id, grandchild.id], [file.id]);
  });

  it("apagar Stood apaga as Pastas e os Arquivos dele", async () => {
    const { userId, stood } = await createUserWithStood();
    const folder = await createFolder(userId, stood.id);
    const rootFile = await createFile(userId, stood.id, buildNote());
    const folderFile = await createFile(userId, stood.id, { ...buildNote(), folderId: folder.id });

    await db.delete(stoods).where(eq(stoods.id, stood.id));

    await expectRemoved([folder.id], [rootFile.id, folderFile.id]);
  });

  it("apagar Usuário apaga os Stoods, as Pastas e os Arquivos dele", async () => {
    const { userId, stood } = await createUserWithStood();
    const folder = await createFolder(userId, stood.id);
    const file = await createFile(userId, stood.id, { ...buildNote(), folderId: folder.id });

    await db.delete(users).where(eq(users.id, userId));

    const remainingStoods = await db.select({ id: stoods.id }).from(stoods).where(eq(stoods.id, stood.id));
    expect(remainingStoods).toEqual([]);
    await expectRemoved([folder.id], [file.id]);
  });
});

// --- Funções auxiliares ---

type Database = Pick<typeof db, "update">;

// Usuário com e-mail único e um Stood "Cálculo"; os nomes podem ser fixos porque a unicidade é por dono
async function createUserWithStood() {
  const userId = await createUser();
  const stood = await createStood(userId, "Cálculo");
  return { userId, stood };
}

// Árvore Aulas > Limites > Derivadas na raiz do Stood
async function createFolderChain(ownerId: string, stoodId: string) {
  const root = await createFolder(ownerId, stoodId, { name: "Aulas" });
  const child = await createFolder(ownerId, stoodId, { name: "Limites", parentId: root.id });
  const grandchild = await createFolder(ownerId, stoodId, { name: "Derivadas", parentId: child.id });
  return { root, child, grandchild };
}

function buildNote(name = "Resumo") {
  return { type: "note" as const, name, content: "# Limites" };
}

function updateFolderParent(database: Database, folderId: string, parentId: string) {
  return database.update(folders).set({ parentId }).where(eq(folders.id, folderId));
}

// Confere a recusa pelo código do Postgres e pelo nome da constraint, não pela mensagem
async function expectViolation(promise: Promise<unknown>, code: string, constraint: string) {
  await expect(promise).rejects.toMatchObject({ cause: { code, constraint } });
}

async function expectRemoved(folderIds: string[], fileIds: string[]) {
  const remainingFolders = await db.select({ id: folders.id }).from(folders).where(inArray(folders.id, folderIds));
  const remainingFiles = await db.select({ id: files.id }).from(files).where(inArray(files.id, fileIds));
  expect({ remainingFolders, remainingFiles }).toEqual({ remainingFolders: [], remainingFiles: [] });
}

type MoveOutcome = { ok: true } | { ok: false; error: unknown };

// Acompanha a query sem rejeitar, para o caso saber se ela já terminou
function trackMove(move: Promise<unknown>) {
  let isSettled = false;
  const outcome = move
    .then(
      (): MoveOutcome => ({ ok: true }),
      (error: unknown): MoveOutcome => ({ ok: false, error }),
    )
    .finally(() => {
      isSettled = true;
    });
  return { outcome, isSettled: () => isSettled };
}

// Espera o Postgres mostrar a conexão parada numa trava; se a query terminar antes, não houve trava e o caso falha no expect
async function waitUntilBlockedOrSettled(pid: number, move: ReturnType<typeof trackMove>) {
  while (!move.isSettled() && !(await isWaitingOnLock(pid))) {
    // Consulta de novo até a espera aparecer
  }
}

async function getBackendPid(connection: PoolClient) {
  const { rows } = await connection.query<{ pid: number }>("select pg_backend_pid() as pid");
  return rows[0].pid;
}

async function isWaitingOnLock(pid: number) {
  const { rows } = await db.$client.query<{ waiting: boolean }>(
    "select exists (select 1 from pg_stat_activity where pid = $1 and wait_event_type = 'Lock') as waiting",
    [pid],
  );
  return rows[0].waiting;
}
