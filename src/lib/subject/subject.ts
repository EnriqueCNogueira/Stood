import "server-only";

import { files } from "@/db/schema";
import { type CreateStoodResult, createStood } from "@/lib/stood/stood";
import { buildSubjectTree, findSubject } from "@/lib/subject/catalog";

export type CreateStoodFromSubjectResult = CreateStoodResult | { ok: false; reason: "materia-nao-encontrada" };

type CreateStoodFromSubjectInput = { subjectSlug: string; name: string; description: string };

// Copia a Matéria para um Stood novo do dono; a Matéria segue intacta e só a cópia pode ser modificada.
// O dono vem da sessão, e a FK composta de files amarra cada Vídeo ao Stood desse mesmo dono.
export async function createStoodFromSubject(
  ownerId: string,
  input: CreateStoodFromSubjectInput,
): Promise<CreateStoodFromSubjectResult> {
  const subject = findSubject(input.subjectSlug);
  if (!subject) return { ok: false, reason: "materia-nao-encontrada" };

  const videoFiles = buildSubjectTree(subject);
  return createStood(ownerId, input, (tx, stoodId) =>
    tx
      .insert(files)
      .values(videoFiles.map((file) => ({ ownerId, stoodId, type: file.type, name: file.name, content: file.videoId }))),
  );
}
