"use client";

import { PanelLeft, Pencil } from "lucide-react";
import { ICON_BUTTON } from "@/app/_components/ui";
import { StoodDialog } from "@/app/_components/workspace/stood-dialog";
import { MAX_VIDEO_WINDOWS, MAX_WINDOWS, type WindowCounts } from "@/lib/board/windows";
import type { StoodDetails } from "@/lib/stood/details";

type BoardBarProps = {
  stoodId: string;
  details: StoodDetails;
  counts: WindowCounts;
  onDetailsSaved: (details: StoodDetails) => void;
  onOpenDrawer: () => void;
};

// Barra do Quadro, à direita da lateral: nome com o lápis de editar, descrição e contador de Janelas
export function BoardBar({ stoodId, details, counts, onDetailsSaved, onOpenDrawer }: BoardBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-5">
      <button type="button" aria-label="Abrir os Arquivos" onClick={onOpenDrawer} className={`${ICON_BUTTON} md:hidden`}>
        <PanelLeft size={18} strokeWidth={1.75} aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <h1 className="min-w-0 truncate text-base font-medium">{details.name}</h1>
          <StoodDialog
            mode="edit"
            stoodId={stoodId}
            details={details}
            onSaved={onDetailsSaved}
            triggerLabel="Editar Stood"
            triggerClassName={`${ICON_BUTTON} flex-none`}
          >
            <Pencil size={14} aria-hidden />
          </StoodDialog>
        </div>
        {details.description && (
          <p title={details.description} className="truncate text-ui text-text-muted">
            {details.description}
          </p>
        )}
      </div>

      <span aria-live="polite" className="order-last w-full rounded-md bg-surface-2 px-2 py-1 font-mono text-meta text-text-muted sm:order-none sm:w-auto">
        <span className={counts.isWindowsFull ? "text-accent-text" : ""}>
          {counts.windows}/{MAX_WINDOWS} Janelas
        </span>
        {" · "}
        <span className={counts.isVideosFull ? "text-accent-text" : ""}>
          {counts.videos}/{MAX_VIDEO_WINDOWS} Vídeos
        </span>
      </span>
    </div>
  );
}
