"use client";

import { Plus, X } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";
import { FIELD, FIELD_LABEL, FOCUS, INPUT, POPOVER } from "@/app/_components/ui";
import { TAG_CHIP } from "@/app/_components/workspace/tag-chips";
import { TAG_REASON_MESSAGES } from "@/app/_components/workspace/tag-messages";
import { MAX_TAGS_PER_STOOD, type StoodTag, buildSortedTags, isSameTagName, validateTagName } from "@/lib/tag/rules";

// Tags escolhidas no diálogo: as que já existem e os nomes novos, que só viram Tag ao salvar o Stood
export type TagSelection = { tags: StoodTag[]; newNames: string[] };

type Option = { kind: "existing"; tag: StoodTag } | { kind: "new"; name: string };

const ALREADY_CHOSEN_MESSAGE = "Esta Tag já está no Stood.";

type TagFieldProps = {
  allTags: StoodTag[];
  selection: TagSelection;
  isInvalid: boolean;
  describedBy?: string;
  onChange: (selection: TagSelection) => void;
};

// Campo de Tags com sugestões: Enter escolhe a sugestão destacada ou cria a Tag nova; o "x" tira a Tag
export function TagField({ allTags, selection, isInvalid, describedBy, onChange }: TagFieldProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const inputId = useId();
  const listboxId = useId();
  const hintId = useId();
  const total = selection.tags.length + selection.newNames.length;
  const isFull = total >= MAX_TAGS_PER_STOOD;
  const options = query.trim() === "" ? [] : buildOptions(allTags, selection, query);
  const isOpen = options.length > 0;
  const activeOption = options[Math.min(activeIndex, options.length - 1)];
  const chosen = buildSortedTags([
    ...selection.tags.map((tag) => ({ key: tag.id, name: tag.name, isNew: false })),
    ...selection.newNames.map((name) => ({ key: `new:${name}`, name, isNew: true })),
  ]);

  function choose(option: Option) {
    if (isFull) {
      setHint(TAG_REASON_MESSAGES["limite-de-tags-do-stood"]);
      return;
    }
    if (option.kind === "existing") {
      onChange({ ...selection, tags: [...selection.tags, option.tag] });
    } else {
      const validation = validateTagName(option.name);
      if (!validation.ok) {
        setHint(TAG_REASON_MESSAGES[validation.reason]);
        return;
      }
      onChange({ ...selection, newNames: [...selection.newNames, validation.name] });
    }
    setQuery("");
    setActiveIndex(0);
    setHint(null);
  }

  function remove(key: string) {
    setHint(null);
    if (key.startsWith("new:")) {
      const name = key.slice("new:".length);
      onChange({ ...selection, newNames: selection.newNames.filter((newName) => newName !== name) });
    } else {
      onChange({ ...selection, tags: selection.tags.filter((tag) => tag.id !== key) });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && query.trim() !== "") {
      // Enter no campo escolhe a Tag em vez de enviar o diálogo
      event.preventDefault();
      if (activeOption) choose(activeOption);
      else if (chosen.some((tag) => isSameTagName(tag.name, query.trim()))) setHint(ALREADY_CHOSEN_MESSAGE);
      return;
    }
    if (event.key === "ArrowDown" && isOpen) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === "ArrowUp" && isOpen) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === "Escape" && query !== "") {
      // Esc limpa o campo antes de fechar o diálogo
      event.preventDefault();
      setQuery("");
    }
  }

  return (
    <div className={FIELD}>
      <label htmlFor={inputId} className={FIELD_LABEL}>
        Tags (opcional)
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeOption ? buildOptionId(listboxId, options.indexOf(activeOption)) : undefined}
          aria-invalid={isInvalid || hint !== null}
          aria-describedby={[describedBy, hint ? hintId : undefined].filter(Boolean).join(" ") || undefined}
          value={query}
          placeholder={isFull ? `Limite de ${MAX_TAGS_PER_STOOD} Tags` : "Digite para buscar ou criar"}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setHint(null);
          }}
          onKeyDown={handleKeyDown}
          className={INPUT}
        />
        {isOpen && (
          <ul id={listboxId} role="listbox" aria-label="Sugestões de Tags" className={`absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto p-1 ${POPOVER}`}>
            {options.map((option, index) => (
              <li
                key={option.kind === "existing" ? option.tag.id : `new:${option.name}`}
                id={buildOptionId(listboxId, index)}
                role="option"
                aria-selected={option === activeOption}
                // mousedown, e não click, para escolher antes de o campo perder o foco
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                className={`flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-ui ${option === activeOption ? "bg-surface-2" : ""}`}
              >
                {option.kind === "existing" ? (
                  <span className="truncate">{option.tag.name}</span>
                ) : (
                  <>
                    <Plus size={14} aria-hidden className="flex-none text-text-muted" />
                    <span className="truncate">Criar Tag &quot;{option.name.trim()}&quot;</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {hint && (
        <span id={hintId} className="text-meta text-danger">
          {hint}
        </span>
      )}

      {chosen.length > 0 && (
        <ul aria-label="Tags do Stood" className="flex flex-wrap gap-1">
          {chosen.map((tag) => (
            <li key={tag.key} className={`${TAG_CHIP} pr-1`}>
              <span className="truncate">{tag.name}</span>
              {tag.isNew && <span className="sr-only">(nova)</span>}
              <button
                type="button"
                aria-label={`Tirar a Tag ${tag.name}`}
                onClick={() => remove(tag.key)}
                className={`grid size-4 flex-none cursor-pointer place-items-center rounded-full hover:bg-border hover:text-text ${FOCUS}`}
              >
                <X size={11} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tags do dono que casam com o texto e ainda não foram escolhidas, mais a opção de criar quando o nome é novo
function buildOptions(allTags: StoodTag[], selection: TagSelection, query: string): Option[] {
  const search = normalize(query.trim());
  const chosenIds = new Set(selection.tags.map((tag) => tag.id));
  const matches = buildSortedTags(allTags.filter((tag) => !chosenIds.has(tag.id) && normalize(tag.name).includes(search)));
  const isTaken = [...allTags.map((tag) => tag.name), ...selection.newNames].some((name) => isSameTagName(name, query.trim()));
  const options: Option[] = matches.map((tag) => ({ kind: "existing", tag }));
  if (!isTaken) options.push({ kind: "new", name: query });
  return options;
}

// Busca sem diferenciar acento nem maiúsculas
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function buildOptionId(listboxId: string, index: number) {
  return `${listboxId}-option-${index}`;
}
