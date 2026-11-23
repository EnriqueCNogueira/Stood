import { z } from "zod";

const uuidSchema = z.uuid();

// Id vindo da entrada que não é uuid é tratado como registro inexistente, sem chegar ao banco
export function isUuid(value: string) {
  return uuidSchema.safeParse(value).success;
}
