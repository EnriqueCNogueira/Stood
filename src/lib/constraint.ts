// O Drizzle embrulha o erro do pg em cause; o nome da constraint identifica qual regra do banco recusou a escrita
export function isConstraintViolation(error: unknown, constraint: string) {
  const cause = error instanceof Error ? error.cause : undefined;
  return typeof cause === "object" && cause !== null && "constraint" in cause && cause.constraint === constraint;
}
