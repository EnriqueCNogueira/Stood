"use client";

import { Download, PanelLeft, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { ICON_BUTTON } from "@/app/_components/ui";
import { ExportDialog } from "@/app/_components/workspace/board/export-dialog";
import { PomodoroControl } from "@/app/_components/workspace/board/pomodoro-control";
import { StoodDialog } from "@/app/_components/workspace/stood-dialog";
import { TagChips } from "@/app/_components/workspace/tag-chips";
import { MAX_VIDEO_WINDOWS, MAX_WINDOWS, type WindowCounts } from "@/lib/board/windows";
import { buildExportTypeCounts } from "@/lib/export/export";
import type { ActiveFocus } from "@/lib/pomodoro/pomodoro";
import type { StoodDetails } from "@/lib/stood/details";
import type { StoodTreeNode } from "@/lib/stood/tree";
import type { StoodTag } from "@/lib/tag/rules";

type BoardBarProps = {
  stoodId: string;
  details: StoodDetails;
  tree: StoodTreeNode[];
  getContent: (fileId: string) => string;
  tags: StoodTag[];
  allTags: StoodTag[];
  counts: WindowCounts;
  activeFocus: ActiveFocus | null;
  serverNow: number;
  onDetailsSaved: (details: StoodDetails, tags: StoodTag[]) => void;
  onOpenDrawer: () => void;
};

// Barra do Quadro, à direita da lateral: nome com o lápis de editar e o botão de exportar, descrição, Tags,
// Pomodoro e contador de Janelas
export function BoardBar({
  stoodId,
  details,
  tree,
  getContent,
  tags,
  allTags,
  counts,
  activeFocus,
  serverNow,
  onDetailsSaved,
  onOpenDrawer,
}: BoardBarProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportTypeCounts = useMemo(() => buildExportTypeCounts(tree), [tree]);
  const canExport = exportTypeCounts.length > 0;

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
            tags={tags}
            allTags={allTags}
            onSaved={onDetailsSaved}
            triggerLabel="Editar Stood"
            triggerClassName={`${ICON_BUTTON} flex-none`}
          >
            <Pencil size={14} aria-hidden />
          </StoodDialog>
          <button
            type="button"
            aria-label="Exportar Stood"
            title={canExport ? "Exportar Stood" : "Crie uma Nota, um Desenho ou uma Imagem para exportar o Stood"}
            disabled={!canExport}
            onClick={() => setIsExportOpen(true)}
            className={`${ICON_BUTTON} flex-none`}
          >
            <Download size={14} aria-hidden />
          </button>
          {isExportOpen && (
            <ExportDialog
              stoodName={details.name}
              tree={tree}
              typeCounts={exportTypeCounts}
              getContent={getContent}
              onClose={() => setIsExportOpen(false)}
            />
          )}
        </div>
        {details.description && (
          <p title={details.description} className="truncate text-ui text-text-muted">
            {details.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-1">
            <TagChips tags={tags} label={`Tags de ${details.name}`} />
          </div>
        )}
      </div>

      {/* Abaixo de lg, o Pomodoro desce para uma linha própria e não aperta o nome do Stood */}
      <div className="order-last w-full lg:order-none lg:w-auto">
        <PomodoroControl stoodId={stoodId} initialFocus={activeFocus} serverNow={serverNow} />
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
