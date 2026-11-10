"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/components/sign-out";
import { FOCUS, MENU_ITEM, MENU_SEPARATOR } from "@/components/ui";

type UserMenuProps = { name: string; email: string; image: string | null };

export function UserMenu({ name, email, image }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha com clique fora ou Esc
  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Menu da conta"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-[13px] font-semibold hover:brightness-110 ${FOCUS}`}
      >
        {image ? <img src={image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : buildInitial(name, email)}
      </button>

      {isOpen && (
        <div role="menu" className="absolute top-10 right-0 w-64 max-w-[calc(100vw-1.5rem)] rounded-md border border-border bg-surface p-1 shadow-card">
          <div className="grid px-2.5 py-2">
            <strong className="truncate font-medium">{name}</strong>
            <span className="truncate text-xs text-text-muted">{email}</span>
          </div>
          <div className={MENU_SEPARATOR} />
          <form action={signOut}>
            <button type="submit" role="menuitem" className={`${MENU_ITEM} cursor-pointer hover:bg-surface-2 ${FOCUS}`}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Sem foto do provedor, o avatar mostra a inicial do nome (ou do e-mail, se o nome vier vazio)
function buildInitial(name: string, email: string) {
  return (name.trim() || email).charAt(0).toUpperCase();
}
