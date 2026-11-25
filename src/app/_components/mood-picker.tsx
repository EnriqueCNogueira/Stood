"use client";

import { Check, SmilePlus } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { useDismiss } from "@/app/_components/dismiss";
import { updateMoodAction } from "@/app/_components/profile/profile-actions";
import { BUTTON, FOCUS, MENU_ITEM, MENU_SEPARATOR, POPOVER } from "@/app/_components/ui";
import { type Mood, MOODS, type MoodId } from "@/lib/profile/rules";

const UNEXPECTED_MESSAGE = "Não foi possível salvar o Humor. Tente de novo.";

type MoodPickerProps = { mood: Mood | null; align?: "start" | "center" };

// Botão do Humor do dia, no Perfil e na saudação da Biblioteca; escolher já salva
export function MoodPicker({ mood, align = "start" }: MoodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(containerRef, isOpen, close);

  function choose(moodId: MoodId | null) {
    close();
    triggerRef.current?.focus();
    startTransition(async () => {
      try {
        const result = await updateMoodAction({ moodId });
        setHasFailed(!result.ok);
      } catch {
        setHasFailed(true);
      }
    });
  }

  // A largura é a da lista, para ela nunca passar da tela onde o botão cabe
  return (
    <div className="grid w-52 gap-2">
      <div ref={containerRef} className={`relative grid ${align === "center" ? "justify-items-center" : "justify-items-start"}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-busy={isPending}
          onClick={() => setIsOpen((open) => !open)}
          className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}
        >
          {mood ? (
            <>
              <span aria-hidden>{mood.emoji}</span>
              <span className="sr-only">Humor de hoje: </span>
              {mood.label}
            </>
          ) : (
            <>
              <SmilePlus size={16} aria-hidden />
              Como você está hoje?
            </>
          )}
        </button>

        {isOpen && (
          <div role="menu" aria-label="Humor de hoje" className={`absolute inset-x-0 top-9 z-40 p-1 text-left ${POPOVER}`}>
            {MOODS.map(({ id, emoji, label }) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={id === mood?.id}
                disabled={isPending}
                onClick={() => choose(id)}
                className={`${MENU_ITEM} cursor-pointer gap-2.5 hover:bg-surface-2 ${FOCUS}`}
              >
                <span aria-hidden>{emoji}</span>
                {label}
                {id === mood?.id && <Check size={14} aria-hidden className="ml-auto text-accent-text" />}
              </button>
            ))}
            {mood && (
              <>
                <div className={MENU_SEPARATOR} />
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => choose(null)}
                  className={`${MENU_ITEM} cursor-pointer hover:bg-surface-2 ${FOCUS}`}
                >
                  Tirar o Humor
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {hasFailed && <FormMessage tone="error">{UNEXPECTED_MESSAGE}</FormMessage>}
    </div>
  );
}
