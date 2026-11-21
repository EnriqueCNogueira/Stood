import { notFound } from "next/navigation";
import { Board } from "@/app/_components/workspace/board/board";
import { requireSession } from "@/lib/auth/session";
import { findActiveFocus } from "@/lib/pomodoro/pomodoro";
import { findBoardStood, updateStoodLastOpenedAt } from "@/lib/stood/stood";

// Quadro de um Stood: abre vazio a cada visita, registra a hora de abertura e mostra o Foco em andamento
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  // Ler e gravar a hora de abertura juntos: a gravação filtra pelo dono e não acha nada se o Stood não for dele
  const [stood, activeFocus] = await Promise.all([
    findBoardStood(user.id, id),
    findActiveFocus(user.id),
    updateStoodLastOpenedAt(user.id, id),
  ]);
  if (!stood) notFound();
  return <Board stood={stood} activeFocus={activeFocus ?? null} serverNow={Date.now()} />;
}
