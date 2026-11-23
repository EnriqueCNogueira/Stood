// Regras das Tags sem I/O: o Service, o client e as CHECK do schema usam estas constantes e funções.
// Sem import com @/, porque o schema importa este arquivo direto no Node.

export const MAX_TAG_NAME_LENGTH = 30;
export const MAX_TAGS_PER_STOOD = 10;
export const MAX_TAGS_PER_USER = 100;

export type StoodTag = { id: string; name: string };

export type TagNameReason = "nome-da-tag-vazio" | "nome-da-tag-longo";

type ValidateTagNameResult = { ok: true; name: string } | { ok: false; reason: TagNameReason };

// O nome é aparado nas pontas antes de conferir o tamanho
export function validateTagName(name: string): ValidateTagNameResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, reason: "nome-da-tag-vazio" };
  if (trimmed.length > MAX_TAG_NAME_LENGTH) return { ok: false, reason: "nome-da-tag-longo" };
  return { ok: true, name: trimmed };
}

// "Prova" e "prova" são a mesma Tag
export function isSameTagName(a: string, b: string) {
  return a.toLocaleLowerCase("pt-BR") === b.toLocaleLowerCase("pt-BR");
}

// Sem Tag ligada, mostra todos; com Tags ligadas, mostra os Stoods que têm qualquer uma delas
export function filterStoodsByTags<T extends { tags: StoodTag[] }>(stoods: T[], tagIds: ReadonlySet<string>): T[] {
  if (tagIds.size === 0) return stoods;
  return stoods.filter((stood) => stood.tags.some((tag) => tagIds.has(tag.id)));
}
