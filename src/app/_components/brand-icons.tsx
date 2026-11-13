import type { SVGProps } from "react";

// Logos de marca: PNG em public/marcas/ nas cores oficiais; o GitHub tem uma versão clara para o tema escuro
type BrandLogoProps = { size?: number; className?: string };

export function GoogleLogo({ size = 16, className = "" }: BrandLogoProps) {
  return <img src="/marcas/google.png" alt="" width={size} height={size} className={className} />;
}

export function LinkedinLogo({ size = 16, className = "" }: BrandLogoProps) {
  return <img src="/marcas/linkedin.png" alt="" width={size} height={size} className={className} />;
}

export function GithubLogo({ size = 16, className = "" }: BrandLogoProps) {
  return (
    <>
      <img src="/marcas/github.png" alt="" width={size} height={size} className={`dark:hidden ${className}`} />
      <img src="/marcas/github-escuro.png" alt="" width={size} height={size} className={`hidden dark:block ${className}`} />
    </>
  );
}

// YouTube sem logo enviado: ícone no traço da Lucide, que tirou as marcas da biblioteca
export function YoutubeIcon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}
