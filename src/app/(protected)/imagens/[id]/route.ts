import { requireSession } from "@/lib/auth/session";
import { findImage } from "@/lib/file/file";

// Cache só no navegador do dono; um dia basta, porque a Imagem ainda não muda depois de enviada
const CACHE_CONTROL = "private, max-age=86400";

// Bytes de uma Imagem do Usuário da sessão; a de outro dono responde 404, sem revelar que existe
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const image = await findImage(user.id, id);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": CACHE_CONTROL,
      // O navegador não adivinha outro tipo, e a resposta não roda nada se for aberta direto
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
