import { buildImageResponse } from "@/app/_components/image-response";
import { requireSession } from "@/lib/auth/session";
import { findImage } from "@/lib/file/file";

// Bytes de uma Imagem do Usuário da sessão; a de outro dono responde 404, sem revelar que existe
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const image = await findImage(user.id, id);
  if (!image) return new Response("Not found", { status: 404 });

  return buildImageResponse(image.data, image.mimeType);
}
