// Logo do Stood em PNG de public/logo/: letras escuras no tema claro e claras no escuro, trocadas pelo data-theme
const LOGOS = {
  full: { light: "/logo/stood.png", dark: "/logo/stood-escuro.png", width: 657, height: 176 },
  word: { light: "/logo/palavra.png", dark: "/logo/palavra-escuro.png", width: 1532, height: 535 },
} as const;

type LogoProps = { variant?: keyof typeof LOGOS; className?: string };

// A altura vem do className; a imagem escondida fica fora da árvore de acessibilidade, então só um "Stood" é lido
export function StoodLogo({ variant = "full", className = "" }: LogoProps) {
  const logo = LOGOS[variant];
  return (
    <>
      <img src={logo.light} alt="Stood" width={logo.width} height={logo.height} className={`block w-auto dark:hidden ${className}`} />
      <img src={logo.dark} alt="Stood" width={logo.width} height={logo.height} className={`hidden w-auto dark:block ${className}`} />
    </>
  );
}
