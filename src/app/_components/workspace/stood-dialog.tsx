"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, DIALOG, FIELD, FIELD_LABEL, ICON_BUTTON, INPUT } from "@/app/_components/ui";
import {
  type CreateStoodActionResult,
  type CreateStoodFromSubjectActionResult,
  type DeleteStoodActionResult,
  type UpdateStoodActionResult,
  createStoodAction,
  createStoodFromSubjectAction,
  deleteStoodAction,
  updateStoodAction,
} from "@/app/_components/workspace/stood-actions";
import { TagField, type TagSelection } from "@/app/_components/workspace/tag-field";
import { TAG_REASON_MESSAGES } from "@/app/_components/workspace/tag-messages";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  type StoodDetails,
  validateStoodDetails,
} from "@/lib/stood/details";
import type { StoodTag } from "@/lib/tag/rules";
import type { UpdateStoodTagsResult } from "@/lib/tag/tag";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

// Recusas que aparecem no campo de Tags: as do Service e o texto digitado que não virou escolha
type TagsReason = Extract<UpdateStoodTagsResult, { ok: false }>["reason"] | "tag-nao-escolhida";

const TAGS_MESSAGES: Record<TagsReason, string> = {
  "nome-da-tag-vazio": TAG_REASON_MESSAGES["nome-da-tag-vazio"],
  "nome-da-tag-longo": TAG_REASON_MESSAGES["nome-da-tag-longo"],
  "limite-de-tags": TAG_REASON_MESSAGES["limite-de-tags"],
  "limite-de-tags-do-stood": TAG_REASON_MESSAGES["limite-de-tags-do-stood"],
  "tag-nao-escolhida": "Aperte Enter para escolher a Tag digitada, ou apague o texto.",
};

// Toda recusa possível do diálogo tem mensagem: um reason novo sem texto não compila
type DialogReason =
  | Exclude<
      CreateStoodActionResult | UpdateStoodActionResult | CreateStoodFromSubjectActionResult | DeleteStoodActionResult,
      { ok: true }
    >["reason"]
  | TagsReason
  | "inesperado";

const REASON_MESSAGES: Record<DialogReason, string> = {
  "nome-vazio": "Dê um nome ao Stood.",
  "nome-longo": `O nome pode ter até ${MAX_NAME_LENGTH} caracteres.`,
  "nome-com-separador": "O nome não pode ter / nem \\.",
  "nome-com-espaco-nas-pontas": "Tire o espaço do começo ou do fim do nome.",
  "nome-repetido": "Você já tem um Stood com esse nome.",
  "descricao-longa": `A descrição pode ter até ${MAX_DESCRIPTION_LENGTH} caracteres.`,
  "stood-nao-encontrado": "Este Stood não existe mais.",
  ...TAGS_MESSAGES,
  "materia-nao-encontrada": "Esta Matéria não existe mais.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};

type StoodDialogProps = {
  triggerClassName: string;
  triggerLabel?: string;
  // Tags do dono, para as sugestões do campo de Tags
  allTags: StoodTag[];
  children: ReactNode;
} & (
  | { mode: "create" }
  | { mode: "subject"; subjectSlug: string; details: StoodDetails }
  | {
      mode: "edit";
      stoodId: string;
      details: StoodDetails;
      tags: StoodTag[];
      onSaved: (details: StoodDetails, tags: StoodTag[]) => void;
    }
);

// Diálogo de nome, descrição e Tags: "Novo Stood" e "Criar Stood" de uma Matéria na Biblioteca, "Editar" no Quadro.
// Mantém o que foi digitado quando há erro.
export function StoodDialog(props: StoodDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const initial = props.mode === "create" ? { name: "", description: null } : props.details;
  const initialTags = props.mode === "edit" ? props.tags : [];
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [selection, setSelection] = useState<TagSelection>({ tags: initialTags, newNames: [] });
  const [tagQuery, setTagQuery] = useState("");
  // Muda a cada abertura, para o campo de Tags começar sem o aviso da abertura anterior
  const [openCount, setOpenCount] = useState(0);
  const [reason, setReason] = useState<DialogReason | null>(null);
  // Só no modo "edit": a confirmação de apagar toma o lugar do formulário
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const title = isConfirmingDelete ? "Apagar Stood" : props.mode === "edit" ? "Editar Stood" : "Novo Stood";
  const isTagsError = reason !== null && reason in TAGS_MESSAGES;
  const isNameError = reason !== null && reason.startsWith("nome-") && !isTagsError;
  const isDescriptionError = reason === "descricao-longa";

  const errorMessage = reason && (
    <FormMessage tone="error" id={errorId}>
      {REASON_MESSAGES[reason]}
    </FormMessage>
  );

  function open() {
    setName(initial.name);
    setDescription(initial.description ?? "");
    setSelection({ tags: initialTags, newNames: [] });
    setTagQuery("");
    setOpenCount((count) => count + 1);
    setReason(null);
    setIsConfirmingDelete(false);
    dialogRef.current?.showModal();
    // Sem isto, o foco cai no "Fechar", o primeiro botão do diálogo, e Enter fecha em vez de escrever o nome
    nameRef.current?.focus();
  }

  // Sem o Stood, o Quadro não tem o que mostrar: volta para a Biblioteca sem deixar o Quadro no histórico
  function deleteStood() {
    if (props.mode !== "edit") return;
    const { stoodId } = props;
    startTransition(async () => {
      try {
        const result = await deleteStoodAction({ stoodId });
        if (result.ok) router.replace("/biblioteca");
        else setReason(result.reason);
      } catch {
        setReason("inesperado");
      }
    });
  }

  function changeTagQuery(query: string) {
    setTagQuery(query);
    setReason((current) => (current === "tag-nao-escolhida" ? null : current));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateStoodDetails({ name, description });
    if (!validation.ok) {
      setReason(validation.reason);
      return;
    }
    if (tagQuery.trim() !== "") {
      setReason("tag-nao-escolhida");
      return;
    }

    const tags = { tagIds: selection.tags.map((tag) => tag.id), newTagNames: selection.newNames };
    startTransition(async () => {
      try {
        if (props.mode !== "edit") {
          const result =
            props.mode === "create"
              ? await createStoodAction({ name, description, tags })
              : await createStoodFromSubjectAction({ subjectSlug: props.subjectSlug, name, description, tags });
          if (result.ok) router.push(`/stood/${result.id}`);
          else setReason(result.reason);
          return;
        }
        const result = await updateStoodAction({ stoodId: props.stoodId, name, description, tags });
        if (!result.ok) {
          setReason(result.reason);
          return;
        }
        props.onSaved(validation.details, result.tags ?? selection.tags);
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
        className={DIALOG}
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

          {isConfirmingDelete && props.mode === "edit" ? (
            <div className="grid gap-4">
              <p className="text-ui text-text-muted">
                <span className="font-medium text-text">{props.details.name}</span> sai da Biblioteca com todas as Pastas e
                Arquivos dele. Os Focos e Compromissos ficam, sem Stood. Não dá para desfazer.
              </p>
              {errorMessage}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setReason(null);
                    setIsConfirmingDelete(false);
                  }}
                  className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
                >
                  Voltar
                </button>
                <button type="button" disabled={isPending} onClick={deleteStood} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger}`}>
                  {isPending ? "Apagando…" : "Apagar Stood"}
                </button>
              </div>
            </div>
          ) : (
            <>
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Nome</span>
              <input
                ref={nameRef}
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
                // Cresce com o texto e mostra a descrição inteira; rows é a altura no navegador sem field-sizing
                rows={5}
                aria-invalid={isDescriptionError}
                aria-describedby={isDescriptionError ? errorId : undefined}
                // h-auto! vence o h-9 do INPUT, que prendia o campo numa linha
                className={`${INPUT} h-auto! min-h-20 resize-none py-2 [field-sizing:content]`}
              />
              <Counter length={description.trim().length} max={MAX_DESCRIPTION_LENGTH} />
            </label>

            {/* Acima do campo, porque a lista de sugestões aberta cobre o que vem abaixo */}
            {isTagsError && errorMessage}

            <TagField
              key={openCount}
              allTags={props.allTags}
              selection={selection}
              query={tagQuery}
              isInvalid={isTagsError}
              describedBy={isTagsError ? errorId : undefined}
              onChange={setSelection}
              onQueryChange={changeTagQuery}
            />

            {!isTagsError && errorMessage}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {props.mode === "edit" && (
                <button
                  type="button"
                  onClick={() => {
                    setReason(null);
                    setIsConfirmingDelete(true);
                  }}
                  className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.ghost} mr-auto hover:not-disabled:text-danger`}
                >
                  Apagar Stood
                </button>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
              >
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>
                {buildSubmitLabel(props.mode, isPending)}
              </button>
            </div>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}

function buildSubmitLabel(mode: StoodDialogProps["mode"], isPending: boolean) {
  if (mode === "edit") return isPending ? "Salvando…" : "Salvar";
  return isPending ? "Criando…" : "Criar Stood";
}

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={`justify-self-end font-mono text-meta ${length > max ? "text-danger" : "text-text-muted"}`}>
      {length}/{max}
    </span>
  );
}

