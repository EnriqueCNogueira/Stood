"use client";

import { useEffect } from "react";

// Renova a sessão do usuário, para a validade de 30 dias
export function SessionRenewal() {
  useEffect(() => {
    void fetch("/auth/get-session", { credentials: "same-origin" });
  }, []);

  return null;
}
