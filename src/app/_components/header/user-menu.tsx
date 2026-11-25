"use client";

import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/app/_components/dismiss";
import { signOut } from "@/app/_components/header/sign-out";
import { UserAvatar } from "@/app/_components/user-avatar";
import { FOCUS, MENU_ITEM, MENU_SEPARATOR, POPOVER } from "@/app/_components/ui";
import type { Mood } from "@/lib/profile/rules";

type UserMenuProps = {
  name: string;
  email: string;
  image: string | null;
  nickname: string | null;
  bio: string | null;
  mood: Mood | null;
};

export function UserMenu({ name, email, image, nickname, bio, mood }: UserMenuProps) {
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
        className={`cursor-pointer rounded-full hover:brightness-110 ${FOCUS}`}
      >
        <UserAvatar name={name} email={email} image={image} className="size-8 text-ui" />
      </button>

      {isOpen && (
        <div role="menu" className={`absolute top-10 right-0 w-64 max-w-[calc(100vw-1.5rem)] p-1 ${POPOVER}`}>
          <div className="flex gap-3 px-2.5 py-2">
            <UserAvatar name={name} email={email} image={image} className="size-10 text-base" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <strong className="truncate font-medium">{nickname ?? name}</strong>
              {mood && (
                <span className="truncate text-meta">
                  <span aria-hidden>{mood.emoji}</span> <span className="sr-only">Humor de hoje: </span>
                  {mood.label}
                </span>
              )}
              {bio && <span className="text-meta wrap-anywhere">{bio}</span>}
              <span className="truncate text-xs text-text-muted">{email}</span>
            </div>
          </div>
          <div className={MENU_SEPARATOR} />
          <a href="/perfil" role="menuitem" className={`${MENU_ITEM} hover:bg-surface-2 ${FOCUS}`}>
            Perfil
          </a>
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
