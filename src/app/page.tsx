// Página provisória: vitrine dos tokens e componentes base da identidade visual.
// Será trocada pela landing; os componentes estão escritos direto na marcação de propósito.

export default function HomePage() {
  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-3 backdrop-blur-md sm:gap-6 sm:px-5">
        <a href="/" className="inline-flex items-center gap-2.5 text-base font-semibold">
          <img src="/icon.svg" width={28} height={28} alt="" />
          <span className="hidden sm:inline">Stood</span>
        </a>
        <nav className="flex gap-1" aria-label="Principal">
          <a href="/" aria-current="page" className={NAV_LINK}>
            Início
          </a>
          <a className={NAV_LINK}>Biblioteca</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" data-theme-toggle aria-label="Alternar tema" className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.ghost}`}>
            <span className="dark:hidden">Escuro</span>
            <span className="hidden dark:inline">Claro</span>
          </button>
          <span title="Visitante" className="grid size-8 place-items-center rounded-full border border-border bg-surface-2 text-[13px] font-semibold">
            V
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-7 pb-30 md:px-12 md:pt-10">
        <h1 className="mb-1.5 text-[32px] font-medium tracking-tight">Componentes base</h1>
        <p className="mb-10 text-text-muted">Tokens, ícone e componentes da etapa. Use o botão de tema no cabeçalho para comparar.</p>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Ícone</h2>
          <div className="flex flex-wrap gap-4">
            {[128, 64, 32, 16].map((size, index) => (
              // Alterna fundo da página e fundo invertido: escuro e claro nos dois temas.
              <div key={size} className={`${CARD} grid min-w-30 place-items-center gap-3 p-5 ${index % 2 ? "bg-text text-bg" : "bg-bg text-text-muted"}`}>
                <img src="/icon.svg" width={size} height={size} alt="" />
                <span className="font-mono text-xs">{size}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Cores</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {COLOR_SWATCHES.map(({ token, label, className }) => (
              <div key={token} className={`${CARD} overflow-hidden bg-surface`}>
                <div className={`h-14 border-b border-border ${className}`} />
                <div className="grid px-2.5 py-2">
                  <span className="text-[13px]">{label}</span>
                  <code className="font-mono text-[11px] text-text-muted">{token}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Tipografia · Geist e Geist Mono</h2>
          <div className="grid gap-3.5">
            {TYPE_SAMPLES.map(({ label, className, text }) => (
              <div key={label} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <code className="w-30 flex-none font-mono text-[11px] text-text-muted">{label}</code>
                <span className={className}>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Botão</h2>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button type="button" className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>Novo Stood</button>
            <button type="button" className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}>Importar</button>
            <button type="button" className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.ghost}`}>Cancelar</button>
            <button type="button" className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.danger}`}>Excluir</button>
            <button type="button" disabled className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>Desabilitado</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary}`}>Grande</button>
            <button type="button" className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}>Médio</button>
            <button type="button" className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.primary}`}>Pequeno</button>
            <button type="button" className={`${BUTTON.base} ${BUTTON.xs} ${BUTTON.secondary}`}>Mínimo</button>
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Campo</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Nome do estudo</span>
              <input className={INPUT} defaultValue="Limites e continuidade" aria-describedby="study-name-hint" />
              <span id="study-name-hint" className="text-xs text-text-muted">Aparece no topo do quadro.</span>
            </label>
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Buscar na biblioteca</span>
              <input className={INPUT} placeholder="Arquivo, pasta ou repositório" />
            </label>
            <label className={FIELD}>
              <span className={FIELD_LABEL}>E-mail</span>
              <input type="email" className={INPUT} defaultValue="marina@" aria-invalid="true" aria-describedby="email-error" />
              <span id="email-error" className="text-xs text-danger">Digite um e-mail válido.</span>
            </label>
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Cartão</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            <a className={`${CARD} block overflow-hidden bg-surface hover:-translate-y-0.5`}>
              <div className="relative grid aspect-video place-items-center bg-surface-2">
                <span className="font-mono text-lg text-text-muted">lim f(x) = L</span>
                <span className={`${BADGE} absolute right-2 bottom-2.5 bg-bg/80`}>31:40</span>
                <div className="absolute inset-x-0 bottom-0 h-0.75 bg-border">
                  <div className="h-full w-3/5 bg-accent" />
                </div>
              </div>
              <div className="px-3.5 pt-3 pb-3.5">
                <strong className="mb-1 block font-medium">Limites e continuidade</strong>
                <span className="text-xs text-text-muted">Cálculo I · 3 notas · ontem</span>
              </div>
            </a>
            <div className={`${CARD} bg-surface p-5`}>
              <span className={`${BADGE} mb-3 bg-accent/12 text-accent-text`}>Repositório</span>
              <strong className="mb-1 block font-medium">Cálculo I</strong>
              <span className="text-[13px] text-text-muted">4 pastas, 23 arquivos. Última versão no GitHub há 2 h.</span>
            </div>
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Menu e segmentado</h2>
          <div className="flex flex-wrap items-start gap-8">
            <div className="w-55 rounded-md border border-border bg-surface p-1 shadow-card">
              <div className="grid px-2.5 py-2">
                <strong className="font-medium">Visitante</strong>
                <span className="text-xs text-text-muted">Sem conta conectada</span>
              </div>
              <div className={MENU_SEPARATOR} />
              <button type="button" disabled className={MENU_ITEM}>
                Conta
                <span className="ml-auto text-[11px]">após o login</span>
              </button>
              <div className="px-2.5 pt-2 pb-1.5 text-xs text-text-muted">Tema</div>
              <div className="px-2.5 pb-2">
                {/* A opção do tema atual fica marcada e sem clique pelo CSS; a outra alterna o tema. */}
                <div className={SEGMENTED}>
                  <button type="button" data-theme-toggle className={`${SEGMENTED_OPTION} dark:pointer-events-none dark:bg-surface dark:text-text`}>
                    Escuro
                  </button>
                  <button type="button" data-theme-toggle className={`${SEGMENTED_OPTION} not-dark:pointer-events-none not-dark:bg-surface not-dark:text-text`}>
                    Claro
                  </button>
                </div>
              </div>
              <div className={MENU_SEPARATOR} />
              <button type="button" disabled className={MENU_ITEM}>
                Sair
              </button>
            </div>
            <div className={SEGMENTED}>
              <button type="button" aria-pressed="true" className={SEGMENTED_OPTION}>Editar</button>
              <button type="button" aria-pressed="false" className={SEGMENTED_OPTION}>Visualizar</button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// Classes completas no código para o Tailwind encontrar; o hex fica só no globals.css.
const COLOR_SWATCHES = [
  { token: "bg", label: "fundo", className: "bg-bg" },
  { token: "surface", label: "superfície", className: "bg-surface" },
  { token: "surface-2", label: "superfície 2", className: "bg-surface-2" },
  { token: "border", label: "borda", className: "bg-border" },
  { token: "text", label: "texto", className: "bg-text" },
  { token: "text-muted", label: "texto secundário", className: "bg-text-muted" },
  { token: "accent", label: "destaque", className: "bg-accent" },
  { token: "accent-text", label: "destaque como texto", className: "bg-accent-text" },
  { token: "on-accent", label: "texto sobre destaque", className: "bg-on-accent" },
  { token: "danger", label: "perigo", className: "bg-danger" },
];

const TYPE_SAMPLES = [
  { label: "display 72/500", className: "text-5xl leading-none font-medium tracking-tighter sm:text-7xl", text: "Stood" },
  { label: "h1 32/500", className: "text-[32px] font-medium tracking-tight", text: "Limites e continuidade" },
  { label: "h2 20/500", className: "text-xl font-medium", text: "Continuar de onde parou" },
  { label: "body 14/400", className: "", text: "Arraste arquivos da aba lateral para abrir uma janela no quadro." },
  { label: "small 12/400", className: "text-xs text-text-muted", text: "Cálculo I · 3 notas · ontem" },
  { label: "mono 12/400", className: "font-mono text-xs", text: "12:04 / 31:40 · a3f9c21" },
];

const SECTION = "mb-12";
const SECTION_TITLE = "mb-4 font-mono text-[13px] font-medium tracking-widest text-text-muted uppercase";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const NAV_LINK = "inline-flex h-8 items-center rounded-md px-3 font-medium text-text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-text";

const BUTTON = {
  base: `inline-flex cursor-pointer items-center justify-center gap-2 border font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS}`,
  xs: "h-6.5 rounded-sm px-2 text-xs",
  sm: "h-7.5 rounded-md px-2.5 text-[13px]",
  md: "h-9 rounded-md px-3.5 text-sm",
  lg: "h-11 rounded-lg px-5 text-[15px]",
  primary: "border-transparent bg-accent text-on-accent shadow-glow hover:not-disabled:brightness-110",
  secondary: "border-border bg-surface text-text hover:not-disabled:bg-surface-2",
  ghost: "border-transparent text-text-muted hover:not-disabled:bg-surface-2 hover:not-disabled:text-text",
  danger: "border-transparent bg-danger/12 text-danger hover:not-disabled:bg-danger/20",
};

const FIELD = "grid gap-1.5";
const FIELD_LABEL = "text-[13px] font-medium text-text-muted";
const INPUT = "h-9 w-full rounded-md border border-border bg-surface px-3 transition placeholder:text-text-muted focus:border-accent focus:ring-3 focus:ring-accent/12 focus:outline-none aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/12";

const CARD = "rounded-lg border border-border shadow-card transition";
const BADGE = "inline-flex h-5.5 items-center rounded-full px-2 font-mono text-[11px] font-medium whitespace-nowrap";

const MENU_SEPARATOR = "my-1 h-px bg-border";
const MENU_ITEM = "flex h-8 w-full items-center rounded-sm px-2.5 text-left text-[13px] disabled:cursor-not-allowed disabled:text-text-muted";

const SEGMENTED = "inline-flex gap-0.5 rounded-md bg-surface-2 p-0.5";
const SEGMENTED_OPTION = `inline-flex h-6 cursor-pointer items-center rounded-sm px-2.5 text-xs text-text-muted aria-pressed:bg-surface aria-pressed:text-text ${FOCUS}`;
