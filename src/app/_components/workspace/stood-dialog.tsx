"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import {
  type CreateStoodActionResult,
  type UpdateStoodActionResult,
  createStoodAction,
  updateStoodAction,
} from "@/app/_components/workspace/stood-actions";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  type StoodDetails,
  validateStoodDetails,
} from "@/lib/stood/details";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

// Toda recusa possível do diálogo tem mensagem: um reason novo sem texto não compila
type DialogReason = Exclude<CreateStoodActionResult | UpdateStoodActionResult, { ok: true }>["reason"] | "inesperado";

const REASON_MESSAGES: Record<DialogReason, string> = {
  "nome-vazio": "Dê um nome ao Stood.",
  "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
  "nome-com-separador": "O nome não pode ter / nem \\.",
  "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
  "nome-repetido": "Você já tem um Stood com esse nome.",
  "descricao-longa": `A descrição pode ter até ${MAX_DESCRIPTION_LENGTH} caracteres.`,
  "stood-nao-encontrado": "Este Stood não existe mais.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type StoodDialogProps = {
  triggerClassName: string;
  triggerLabel?: string;
  children: ReactNode;
} & (
  | { mode: "create" }
  | { mode: "edit"; stoodId: string; details: StoodDetails; onSaved: (details: StoodDetails) => void }
);

// Diálogo de nome e descrição: "Novo Stood" na Biblioteca e "Editar" no Quadro; mantém o que foi digitado quando há erro
export function StoodDialog(props: StoodDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const errorId = useId();
  const initial = props.mode === "edit" ? props.details : { name: "", description: null };
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [reason, setReason] = useState<DialogReason | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const title = props.mode === "create" ? "Novo Stood" : "Editar Stood";
  const isNameError = reason !== null && reason.startsWith("nome");
  const isDescriptionError = reason === "descricao-longa";

  function open() {
    setName(initial.name);
    setDescription(initial.description ?? "");
    setReason(null);
    dialogRef.current?.showModal();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateStoodDetails({ name, description });
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          const result = await createStoodAction({ name, description });
          if (result.ok) router.push(`/stood/${result.id}`);
          else setReason(result.reason);
          return;
        }
        const result = await updateStoodAction({ stoodId: props.stoodId, name, description });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        props.onSaved(validation.details);
        dialogRef.current?.close();
      } catch {
        setReason("inesperado");
      }
    });
  }

  return (
    <>
      <button type="button" aria-label={props.triggerLabel} onClick={open} className={props.triggerClassName}>
        {props.children}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto rounded-lg border border-border bg-surface text-text shadow-card backdrop:bg-bg/70"
      >
        <form onSubmit={submit} noValidate className="grid w-md max-w-full gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-medium tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => dialogRef.current?.close()}
              className={ICON_BUTTON}
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <label className={FIELD}>
            <span className={FIELD_LABEL}>Nome</span>
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              aria-invalid={isNameError}
              aria-describedby={isNameError ? errorId : undefined}
              className={INPUT}
            />
            <Counter length={name.length} max={MAX_NAME_LENGTH} />
          </label>

          <label className={FIELD}>
            <span className={FIELD_LABEL}>Descrição (opcional)</span>
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              aria-invalid={isDescriptionError}
              aria-describedby={isDescriptionError ? errorId : undefined}
              className={`${INPUT} h-auto resize-none py-2`}
            />
            <Counter length={description.trim().length} max={MAX_DESCRIPTION_LENGTH} />
          </label>

          {reason && (
            <FormMessage tone="error" id={errorId}>
              {REASON_MESSAGES[reason]}
            </FormMessage>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
            >
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
              {props.mode === "create" ? "Criar Stood" : "Salvar"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={`justify-self-end font-mono text-meta ${length > max ? "text-danger" : "text-text-muted"}`}>
      {length}/{max}
    </span>
  );
}

