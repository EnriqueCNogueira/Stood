import type { StoodTag } from "@/lib/tag/rules";

export const TAG_CHIP = "inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-meta text-text-muted";

// Tags de um Stood, só para ver: cartão de "Continuar de onde parou" e barra do Quadro
export function TagChips({ tags, label }: { tags: StoodTag[]; label: string }) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label={label} className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <li key={tag.id} className={TAG_CHIP}>
          <span className="truncate">{tag.name}</span>
        </li>
      ))}
    </ul>
  );
}
