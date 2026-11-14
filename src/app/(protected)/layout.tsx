import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { SessionRenewal } from "@/app/_components/session-renewal";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <>
      {children}
      <SessionRenewal />
    </>
  );
}
