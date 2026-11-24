"use client";

import { Brain, CircleHelp, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import { BELOW_HEADER, BUTTON, FOCUS, POPOVER } from "@/app/_components/ui";
import { ManageTagsDialog } from "@/app/_components/workspace/library/manage-tags-dialog";
import { Sidebar } from "@/app/_components/workspace/sidebar";
import { StoodDialog } from "@/app/_components/workspace/stood-dialog";
import { FileLabel, TREE_CHILDREN, TREE_ROW, TreeChevron, TreeList } from "@/app/_components/workspace/tree";
import { SIDEBAR_WIDTH_STORAGE_KEYS } from "@/lib/board/preferences";
import { type StoodWithTree, buildSortedByName } from "@/lib/stood/tree";
import { type StoodTag, filterStoodsByTags } from "@/lib/tag/rules";

const DEFAULT_WIDTH = 264;
const TOOLTIP_WIDTH = 240;
const TOOLTIP_GAP = 6;
const VIEWPORT_MARGIN = 8;

type LibrarySidebarProps = {
  stoods: StoodWithTree[];
  tags: { id: string; name: string; stoodCount: number }[];
  // Tags ligadas no filtro, lidas de ?tags= pela página
  selectedTagIds: string[];
};

// Barra lateral da Biblioteca: "Novo Stood", o filtro por Tag e a árvore dos Stoods; no celular vira um bloco acima do conteúdo
export function LibrarySidebar({ stoods, tags, selectedTagIds: initialTagIds }: LibrarySidebarProps) {
  const router = useRouter();
  const [selectedTagIds, setSelectedTagIds] = useState<ReadonlySet<string>>(() => new Set(initialTagIds));
  const allTags = useMemo(() => tags.map(({ id, name }) => ({ id, name })), [tags]);
  const filterTags = useMemo(() => buildFilterTags(stoods), [stoods]);
  // Tag ligada que deixou de marcar Stoods (apagada ou tirada) sai do filtro sozinha
  const activeTagIds = useMemo(
    () => new Set(filterTags.filter((tag) => selectedTagIds.has(tag.id)).map((tag) => tag.id)),
    [filterTags, selectedTagIds],
  );
  const visibleStoods = filterStoodsByTags(stoods, activeTagIds);
  // "Gerenciar Tags" só precisa do nome e das Tags de cada Stood, não da árvore
  const pickerStoods = useMemo(
    () => stoods.map((stood) => ({ id: stood.id, name: stood.name, tagIds: stood.tags.map((tag) => tag.id) })),
    [stoods],
  );

  // O filtro vai para a URL: sobrevive ao F5 e à volta do Quadro, e a página filtra também os cartões
  function toggleTag(tagId: string) {
    const next = new Set(activeTagIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelectedTagIds(next);
    router.replace(buildLibraryPath(next), { scroll: false });
  }

  return (
    <Sidebar
      label="Stoods"
      widthStorageKey={SIDEBAR_WIDTH_STORAGE_KEYS.library}
      defaultWidth={DEFAULT_WIDTH}
      className={`border-b md:sticky md:top-14 md:border-b-0 ${BELOW_HEADER.mdHeight}`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <StoodDialog mode="create" allTags={allTags} triggerClassName={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary} w-full`}>
          <Plus size={16} aria-hidden />
          Novo Stood
        </StoodDialog>

        <div className="grid gap-1.5">
          {filterTags.length > 0 && (
            <div role="group" aria-labelledby="library-tag-filter" className="grid gap-1.5 px-2">
              <p id="library-tag-filter" className="text-xs font-medium text-text-muted">
                Filtrar por Tag
              </p>
              <div className="flex flex-wrap gap-1">
                {filterTags.map((tag) => {
                  const isActive = activeTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => toggleTag(tag.id)}
                      className={`max-w-full cursor-pointer truncate rounded-full border px-2 py-0.5 text-meta transition ${FOCUS} ${
                        isActive
                          ? "border-accent bg-accent/12 text-accent-text"
                          : "border-border bg-surface-2 text-text-muted hover:text-text"
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <ManageTagsDialog tags={tags} stoods={pickerStoods} />
        </div>

        <div>
          <p id="library-stoods" className="mb-1 px-2 text-xs font-medium text-text-muted">
            Stoods
          </p>
          {visibleStoods.length > 0 ? (
            <ul aria-labelledby="library-stoods">
              {visibleStoods.map((stood) => (
                <li key={stood.id}>
                  <StoodItem stood={stood} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 text-ui text-text-muted">
              {stoods.length > 0 ? "Nenhum Stood com essas Tags." : "Nenhum Stood ainda."}
            </p>
          )}
        </div>
      </div>
    </Sidebar>
  );
}

// A seta só abre e fecha a árvore; o resto da linha abre o Quadro, e o Arquivo da árvore abre o Quadro com ele numa Janela
function StoodItem({ stood }: { stood: StoodWithTree }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`${TREE_ROW} group gap-0 px-0 hover:bg-surface-2`}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Fechar" : "Abrir"} a árvore de ${stood.name}`}
          onClick={() => setIsOpen((open) => !open)}
          className={`grid h-full w-7 flex-none cursor-pointer place-items-center rounded-sm hover:text-text ${FOCUS}`}
        >
          <TreeChevron isOpen={isOpen} />
        </button>
        <a
          href={`/stood/${stood.id}`}
          className={`flex h-full min-w-0 flex-1 items-center gap-2 rounded-sm pr-2 group-hover:text-text ${FOCUS}`}
        >
          <Brain size={16} strokeWidth={1.75} aria-hidden className="flex-none text-accent-text" />
          <span className="truncate">{stood.name}</span>
        </a>
        {stood.description && <DescriptionHint name={stood.name} description={stood.description} />}
      </div>
      {isOpen && (
        <div className={TREE_CHILDREN}>
          {stood.tree.length > 0 ? (
            <TreeList
              nodes={stood.tree}
              renderFile={(file) => (
                <a href={`/stood/${stood.id}?arquivo=${file.id}`} className={`${TREE_ROW} hover:bg-surface-2 hover:text-text ${FOCUS}`}>
                  <FileLabel file={file} />
                </a>
              )}
            />
          ) : (
            <p className="px-2 py-1 text-ui text-text-muted">Stood vazio</p>
          )}
        </div>
      )}
    </>
  );
}

// Descrição no (?): abre ao passar o mouse, focar pelo teclado ou tocar
function DescriptionHint({ name, description }: { name: string; description: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN;
    setPosition({ top: rect.bottom + TOOLTIP_GAP, left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft)) });
  }

  function hide() {
    setPosition(null);
    setIsPinned(false);
  }

  function closeOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") hide();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Descrição de ${name}`}
        aria-expanded={position !== null}
        onMouseEnter={show}
        onMouseLeave={() => !isPinned && setPosition(null)}
        onFocus={show}
        onBlur={hide}
        onKeyDown={closeOnEscape}
        onClick={() => {
          setIsPinned((pinned) => !pinned);
          show();
        }}
        className={`mr-1 grid size-6 flex-none cursor-pointer place-items-center rounded-sm hover:text-text ${FOCUS}`}
      >
        <CircleHelp size={14} aria-hidden />
      </button>
      {position && (
        <p
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className={`fixed z-40 w-60 px-3 py-2 text-ui text-text ${POPOVER}`}
        >
          {description}
        </p>
      )}
    </>
  );
}

function buildLibraryPath(tagIds: ReadonlySet<string>) {
  return tagIds.size > 0 ? `/biblioteca?tags=${[...tagIds].join(",")}` : "/biblioteca";
}

// Só as Tags que marcam algum Stood entram no filtro: ligar uma Tag sem Stood sempre esvaziaria a lista
function buildFilterTags(stoods: StoodWithTree[]): StoodTag[] {
  const byId = new Map(stoods.flatMap((stood) => stood.tags).map((tag) => [tag.id, tag]));
  return buildSortedByName([...byId.values()]);
}
