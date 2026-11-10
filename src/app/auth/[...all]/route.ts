import { getAuth } from "@/lib/auth/auth";

// Rotas da Better Auth sob /auth (login social, callback, e-mail e senha, sessão)
function handleAuthRequest(request: Request) {
  return getAuth().handler(request);
}

export { handleAuthRequest as GET, handleAuthRequest as POST };
