import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/app/_components/footer";
import { Header } from "@/app/_components/header/header";
import { THEME_STORAGE_KEY, buildTheme } from "@/lib/theme/theme";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Stood",
  description: "Seu estudo inteiro em uma tela só.",
};

// Aplica o tema antes da pintura, para a tela não piscar, usando a mesma buildTheme que o teste cobre
const THEME_SCRIPT = `(() => {
  const buildTheme = ${buildTheme.toString()};
  const media = matchMedia("(prefers-color-scheme: dark)");
  const readStored = () => { try { return localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch { return null; } };
  const apply = () => { document.documentElement.dataset.theme = buildTheme(readStored(), media.matches); };
  apply();
  media.addEventListener("change", apply);
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
