import { buildImageResponse } from "@/app/_components/image-response";
import { requireSession } from "@/lib/auth/session";
import { findPhoto } from "@/lib/profile/profile";

// Bytes da Foto do próprio Usuário; a de ninguém mais sai daqui
export async function GET() {
  const user = await requireSession();
  const photo = await findPhoto(user.id);
  if (!photo) return new Response("Not found", { status: 404 });

  return buildImageResponse(photo, "image/jpeg");
}
