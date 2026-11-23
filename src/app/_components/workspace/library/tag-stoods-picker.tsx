"use client";

import { useState } from "react";
import { BUTTON, FOCUS } from "@/app/_components/ui";
import { MAX_TAGS_PER_STOOD } from "@/lib/tag/rules";

export type PickerStood = { id: string; name: string; tagIds: string[] };

type TagStoodsPickerProps = {
  tagId: string;
  tagName: string;
  stoods: PickerStood[];
  isPending: boolean;
  onSave: (stoodIds: string[]) => void;
  onCancel: () => void;
};

// Stoods em ordem alfabética, com caixas: marca ou tira a Tag e só grava no "Salvar".
// Stood que já tem o limite de Tags, sem esta, aparece desativado com o motivo.
export function TagStoodsPicker({ tagId, tagName, stoods, isPending, onSave, onCancel }: TagStoodsPickerProps) {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set(stoods.filter((stood) => stood.tagIds.includes(tagId)).map((stood) => stood.id)),
  );

  function toggle(stoodId: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(stoodId)) next.delete(stoodId);
      else next.add(stoodId);
      return next;
    });
  }

  if (stoods.length === 0) {
    return <p className="px-1 text-ui text-text-muted">Você ainda não tem Stoods para marcar.</p>;
  }

  return (
    <div className="grid gap-2">
      <fieldset className="grid max-h-56 gap-0.5 overflow-y-auto rounded-md border border-border p-1">
        <legend className="sr-only">Stoods marcados por {tagName}</legend>
        {stoods.map((stood) => {
          const isChecked = checkedIds.has(stood.id);
          const isFull = !stood.tagIds.includes(tagId) && stood.tagIds.length >= MAX_TAGS_PER_STOOD;
          return (
            <label
              key={stood.id}
              className={`flex h-8 items-center gap-2 rounded-sm px-2 text-ui ${isFull ? "opacity-45" : "cursor-pointer hover:bg-surface-2"}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isFull}
                onChange={() => toggle(stood.id)}
                className={`size-4 flex-none accent-accent ${FOCUS}`}
              />
              <span className="min-w-0 flex-1 truncate">{stood.name}</span>
              {isFull && <span className="flex-none text-meta text-text-muted">já tem {MAX_TAGS_PER_STOOD} Tags</span>}
            </label>
          );
        })}
      </fieldset>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.secondary}`}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onSave([...checkedIds])}
          className={`${BUTTON.base} ${BUTTON.sm} ${BUTTON.primary}`}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
