"use client";

import { usePathname } from "next/navigation";
import { NAV_LINK } from "@/components/ui";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/biblioteca", label: "Biblioteca" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1" aria-label="Principal">
      {LINKS.map(({ href, label }) => (
        <a key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={NAV_LINK}>
          {label}
        </a>
      ))}
    </nav>
  );
}
