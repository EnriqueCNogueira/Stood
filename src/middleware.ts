import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { buildSignInPath, REQUESTED_PATH_HEADER } from "@/lib/auth/destination";

// Só confere se o cookie de sessão existe, sem consultar o banco.
// A validação de verdade é o requireSession() do layout de (protected).
export function middleware(request: NextRequest) {
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL(buildSignInPath(requestedPath), request.url));

  // O caminho pedido segue para o requireSession(), que também manda entrar quando a sessão já não vale
  const headers = new Headers(request.headers);
  headers.set(REQUESTED_PATH_HEADER, requestedPath);
  return NextResponse.next({ request: { headers } });
}

// O grupo (protected) não aparece na URL: toda rota nova do grupo entra nesta lista
export const config = {
  matcher: ["/biblioteca/:path*", "/stood/:path*", "/imagens/:path*", "/agenda/:path*", "/perfil/:path*"],
};
