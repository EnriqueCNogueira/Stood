import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Só confere se o cookie de sessão existe, sem consultar o banco.
// A validação de verdade é o requireSession() do layout de (protected).
export function middleware(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL("/entrar", request.url));
}

// O grupo (protected) não aparece na URL: toda rota nova do grupo entra nesta lista
export const config = {
  matcher: ["/biblioteca/:path*"],
};
