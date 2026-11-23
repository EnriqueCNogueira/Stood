import { notFound } from "next/navigation";
import { Board } from "@/app/_components/workspace/board/board";
import { requireSession } from "@/lib/auth/session";
import { getStoodEditableContents } from "@/lib/file/file";
import { findActiveFocus } from "@/lib/pomodoro/pomodoro";
import { findBoardStood, updateStoodLastOpenedAt } from "@/lib/stood/stood";
import { getTags } from "@/lib/tag/tag";

// Quadro de um Stood: abre com as Janelas salvas, registra a hora de abertura, mostra o Foco em andamento
// e traz as Tags do dono para o diálogo
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  // Ler e gravar a hora de abertura juntos: todas filtram pelo dono e não acham nada se o Stood não for dele
  const [stood, editableContents, activeFocus, tags] = await Promise.all([
    findBoardStood(user.id, id),
    getStoodEditableContents(user.id, id),
    findActiveFocus(user.id),
    getTags(user.id),
    updateStoodLastOpenedAt(user.id, id),
  ]);
  if (!stood) notFound();
  return (
    <Board
      stood={stood}
      editableContents={editableContents}
      activeFocus={activeFocus ?? null}
      serverNow={Date.now()}
      allTags={tags.map((tag) => ({ id: tag.id, name: tag.name }))}
    />
  );
}
