import type { CSSProperties } from "react";

// O desenho fica em public/logo/cerebro-traco.svg, em vista lateral como o cérebro da logo, e entra como máscara:
// a cor vem do token accent, então acompanha os dois temas sem cor fixa no SVG
const BRAIN_MASK: CSSProperties = {
  aspectRatio: "600 / 460",
  maskImage: "url(/logo/cerebro-traco.svg)",
  maskSize: "contain",
  maskRepeat: "no-repeat",
};

// Detalhe decorativo no canto inferior direito da Biblioteca: fixo na tela, cortado pela borda e bem transparente
export function LibraryBrain() {
  return (
    <div
      aria-hidden
      style={BRAIN_MASK}
      className="pointer-events-none fixed -right-32 -bottom-36 -z-10 hidden w-2xl bg-accent opacity-15 md:block"
    />
  );
}
