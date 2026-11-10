export const MIN_PASSWORD_LENGTH = 8;

const UPPERCASE_LETTER = /[A-Z]/;
const DIGIT = /\d/;
const SPECIAL_CHARACTER = /[^A-Za-z0-9]/;

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    UPPERCASE_LETTER.test(password) &&
    DIGIT.test(password) &&
    SPECIAL_CHARACTER.test(password)
  );
}
