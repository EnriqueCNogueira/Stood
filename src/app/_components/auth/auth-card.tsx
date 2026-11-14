import type { ReactNode } from "react";
import { BELOW_HEADER, CARD, FIELD, FIELD_LABEL, INPUT } from "@/app/_components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

// Moldura das telas de entrar, cadastro e senha
export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className={`mx-auto grid ${BELOW_HEADER.minHeight} w-full max-w-sm content-center px-4 py-10 2xl:max-w-md 2xl:text-lg`}>
      <h1 className="mb-1.5 text-2xl font-medium tracking-tight 2xl:mb-2 2xl:text-3xl">{title}</h1>
      {description && <p className="mb-6 text-text-muted">{description}</p>}
      <div className={`${CARD} bg-surface p-5 2xl:p-7`}>{children}</div>
    </main>
  );
}

// Campo de senha nova, com a regra do Stood na dica
export function NewPasswordField({ label }: { label: string }) {
  return (
    <label className={FIELD}>
      <span className={FIELD_LABEL}>{label}</span>
      <input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required aria-describedby="password-hint" className={INPUT} />
      <span id="password-hint" className="text-xs text-text-muted 2xl:text-sm">
        Pelo menos {MIN_PASSWORD_LENGTH} caracteres, com letra maiúscula, número e caractere especial.
      </span>
    </label>
  );
}

export function FormMessage({ tone, id, children }: { tone: "error" | "success"; id?: string; children: ReactNode }) {
  const color = tone === "error" ? "bg-danger/12 text-danger" : "bg-accent/12 text-accent-text";
  return (
    <p id={id} role={tone === "error" ? "alert" : "status"} className={`rounded-md px-3 py-2 text-ui 2xl:text-sm ${color}`}>
      {children}
    </p>
  );
}
