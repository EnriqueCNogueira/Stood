import { notFound } from "next/navigation";
import { Board } from "@/app/_components/workspace/board/board";
import { requireSession } from "@/lib/auth/session";
import { getStoodEditableContents } from "@/lib/file/file";
import { findBoardStood, updateStoodLastOpenedAt } from "@/lib/stood/stood";

// Quadro de um Stood: abre com as Janelas salvas e registra a hora de abertura
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  // Ler e gravar a hora de abertura juntos: todas filtram pelo dono e não acham nada se o Stood não for dele
  const [stood, editableContents] = await Promise.all([
    findBoardStood(user.id, id),
    getStoodEditableContents(user.id, id),
    updateStoodLastOpenedAt(user.id, id),
  ]);
  if (!stood) notFound();
  return <Board stood={stood} editableContents={editableContents} />;
}
