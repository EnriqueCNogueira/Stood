import type {
  CreateTagActionResult,
  DeleteTagActionResult,
  UpdateTagNameActionResult,
  UpdateTagStoodsActionResult,
} from "@/app/_components/workspace/tag-actions";
import { MAX_TAG_NAME_LENGTH, MAX_TAGS_PER_STOOD, MAX_TAGS_PER_USER } from "@/lib/tag/rules";
import type { UpdateStoodTagsResult } from "@/lib/tag/tag";

type TagReason =
  | Extract<
      CreateTagActionResult | UpdateTagNameActionResult | DeleteTagActionResult | UpdateTagStoodsActionResult | UpdateStoodTagsResult,
      { ok: false }
    >["reason"]
  | "inesperado";

const UNEXPECTED_MESSAGE = "Não foi possível salvar. Tente de novo.";

// Toda recusa de Tag tem texto: um reason novo sem mensagem não compila
export const TAG_REASON_MESSAGES: Record<TagReason, string> = {
  "nome-da-tag-vazio": "Dê um nome à Tag.",
  "nome-da-tag-longo": `A Tag pode ter até ${MAX_TAG_NAME_LENGTH} caracteres.`,
  "nome-da-tag-repetido": "Já existe uma Tag com esse nome.",
  "limite-de-tags": `Você chegou ao limite de ${MAX_TAGS_PER_USER} Tags. Apague uma em Gerenciar Tags.`,
  "limite-de-tags-do-stood": `Um Stood pode ter até ${MAX_TAGS_PER_STOOD} Tags.`,
  "tag-nao-encontrada": "Esta Tag não existe mais.",
  "entrada-invalida": UNEXPECTED_MESSAGE,
  inesperado: UNEXPECTED_MESSAGE,
};
