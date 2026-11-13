"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession, revokeSession } from "@/lib/auth/session";

// Sair encerra a sessão no banco na hora; o cookie é apagado pelo nextCookies da config de auth
export async function signOut() {
  await requireSession();
  await revokeSession(await headers());
  redirect("/");
}
