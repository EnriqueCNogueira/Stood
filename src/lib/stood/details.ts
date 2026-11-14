import { z } from "zod";

// Fonte única das regras de nome e descrição: src/db/schema.ts monta os CHECKs com estas constantes
export const MAX_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 200;
export const PATH_SEPARATOR_PATTERN = String.raw`[/\\]`;
export const EDGE_WHITESPACE_PATTERN = String.raw`^\s|\s$`;

const PATH_SEPARATOR = new RegExp(PATH_SEPARATOR_PATTERN);
const EDGE_WHITESPACE = new RegExp(EDGE_WHITESPACE_PATTERN);

export type StoodDetailsReason =
  | "nome-vazio"
  | "nome-longo"
  | "nome-com-separador"
  | "nome-com-espaco-nas-pontas"
  | "descricao-longa";

type StoodDetails = { name: string; description: string | null };

type ValidateStoodDetailsResult = { ok: true; details: StoodDetails } | { ok: false; reason: StoodDetailsReason };

// Regras de nome e descrição do diálogo; a mensagem de cada recusa é o próprio reason
const stoodDetailsSchema = z.object({
  name: z
    .string()
    .refine((name) => name.trim().length > 0, { message: "nome-vazio", abort: true })
    .refine((name) => name.length <= MAX_NAME_LENGTH, { message: "nome-longo", abort: true })
    .refine((name) => !PATH_SEPARATOR.test(name), { message: "nome-com-separador", abort: true })
    .refine((name) => !EDGE_WHITESPACE.test(name), { message: "nome-com-espaco-nas-pontas", abort: true }),
  description: z
    .string()
    .transform((description) => description.trim())
    .refine((description) => description.length <= MAX_DESCRIPTION_LENGTH, { message: "descricao-longa" })
    .transform((description) => (description === "" ? null : description)),
});

export function validateStoodDetails(input: { name: string; description: string }): ValidateStoodDetailsResult {
  const parsed = stoodDetailsSchema.safeParse(input);
  if (parsed.success) return { ok: true, details: parsed.data };
  return { ok: false, reason: parsed.error.issues[0].message as StoodDetailsReason };
}
