"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string;
};

// Campo de senha com o botão de mostrar e esconder o que foi digitado
export function PasswordField({ label, name, autoComplete, hint, error }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined].filter(Boolean).join(" ");

  return (
    <div className={FIELD}>
      <label htmlFor={inputId} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={error !== undefined}
          aria-describedby={describedBy || undefined}
          className={`${INPUT} pr-11`}
        />
        <button
          type="button"
          aria-label={`${isVisible ? "Esconder" : "Mostrar"} o campo ${label}`}
          aria-controls={inputId}
          onClick={() => setIsVisible((visible) => !visible)}
          className={`${ICON_BUTTON} absolute inset-y-0 right-1 my-auto`}
        >
          {isVisible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      {error && (
        <span id={errorId} role="alert" className="text-meta text-danger">
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className="text-xs text-text-muted 2xl:text-sm">
          {hint}
        </span>
      )}
    </div>
  );
}
