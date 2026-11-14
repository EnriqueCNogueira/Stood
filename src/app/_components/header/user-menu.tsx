"use client";

import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { signOut } from "@/app/_components/header/sign-out";
import { FOCUS, MENU_ITEM, MENU_SEPARATOR, POPOVER } from "@/app/_components/ui";

type UserMenuProps = { name: string; email: string; image: string | null };

export function UserMenu({ name, email, image }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Menu da conta"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-ui font-semibold hover:brightness-110 ${FOCUS}`}
      >
        {image ? <img src={image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : buildInitial(name, email)}
      </button>

      {isOpen && (
        <div role="menu" className={`absolute top-10 right-0 w-64 max-w-[calc(100vw-1.5rem)] p-1 ${POPOVER}`}>
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
