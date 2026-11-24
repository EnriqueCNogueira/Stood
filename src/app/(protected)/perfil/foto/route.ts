import { requireSession } from "@/lib/auth/session";
import { findPhoto } from "@/lib/profile/profile";

// Cache só no navegador do dono; a Foto nova vem com outro endereço
const CACHE_CONTROL = "private, max-age=86400";

// Bytes da Foto do próprio Usuário; a de ninguém mais sai daqui
export async function GET() {
  const user = await requireSession();
  const photo = await findPhoto(user.id);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": CACHE_CONTROL,
      // O navegador não adivinha outro tipo, e a resposta não roda nada se for aberta direto
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
