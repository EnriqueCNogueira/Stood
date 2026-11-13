// Classes dos componentes base, escritas por inteiro para o Tailwind encontrar; a cor vem só dos tokens do globals.css.

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const TEXT_LINK = `text-ui text-link underline underline-offset-2 hover:decoration-2 2xl:text-sm ${FOCUS}`;

export const NAV_LINK = "inline-flex h-8 items-center rounded-md px-3 font-medium text-text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-text";

export const BUTTON = {
  base: `inline-flex cursor-pointer items-center justify-center gap-2 border font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS}`,
  xs: "h-6.5 rounded-sm px-2 text-xs",
  sm: "h-7.5 rounded-md px-2.5 text-ui",
  // md e lg crescem um degrau em telas 2xl, junto com o texto das páginas
  md: "h-9 rounded-md px-3.5 text-sm 2xl:h-10.5 2xl:px-4 2xl:text-base",
  lg: "h-11 rounded-lg px-5 text-base 2xl:h-13 2xl:px-6 2xl:text-lg",
  primary: "border-transparent bg-accent text-on-accent shadow-glow hover:not-disabled:brightness-110",
  secondary: "border-border bg-surface text-text hover:not-disabled:bg-surface-2",
  ghost: "border-transparent text-text-muted hover:not-disabled:bg-surface-2 hover:not-disabled:text-text",
  danger: "border-transparent bg-danger/12 text-danger hover:not-disabled:bg-danger/20",
};

export const FIELD = "grid gap-1.5";
export const FIELD_LABEL = "text-ui font-medium text-text-muted 2xl:text-sm";
export const INPUT = "h-9 w-full rounded-md border border-border bg-surface px-3 transition placeholder:text-text-muted focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/12 2xl:h-10.5 2xl:text-base";

export const CARD = "rounded-lg border border-border shadow-card transition";
export const BADGE = "inline-flex h-5.5 items-center rounded-full px-2 font-mono text-meta font-medium whitespace-nowrap";

export const MENU_SEPARATOR = "my-1 h-px bg-border";
export const MENU_ITEM = "flex h-8 w-full items-center rounded-sm px-2.5 text-left text-ui disabled:cursor-not-allowed disabled:text-text-muted";

export const SEGMENTED = "inline-flex gap-0.5 rounded-md bg-surface-2 p-0.5";
export const SEGMENTED_OPTION = `inline-flex h-6 cursor-pointer items-center rounded-sm px-2.5 text-xs text-text-muted aria-pressed:bg-surface aria-pressed:text-text ${FOCUS}`;
