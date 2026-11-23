"use client";

import { X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/app/_components/auth/auth-card";
import { BUTTON, DIALOG, FOCUS, ICON_BUTTON } from "@/app/_components/ui";
import { buildStoodArchive, downloadFile } from "@/app/_components/workspace/board/stood-archive";
import {
  type ExportType,
  type ExportTypeCount,
  buildExportEntries,
  buildExportZipName,
} from "@/lib/export/export";
import type { StoodTreeNode } from "@/lib/stood/tree";

// Record obriga rótulo para cada tipo exportável
const TYPE_LABELS: Record<ExportType, { one: string; many: string; format: string }> = {
  note: { one: "Nota", many: "Notas", format: ".txt" },
  drawing: { one: "Desenho", many: "Desenhos", format: ".pdf" },
  image: { one: "Imagem", many: "Imagens", format: ".jpg" },
};
const EXPORT_FAILED_MESSAGE = "Não foi possível exportar o Stood. Tente de novo.";

type ExportDialogProps = {
  stoodName: string;
  tree: StoodTreeNode[];
  typeCounts: ExportTypeCount[];
  getContent: (fileId: string) => string;
  onClose: () => void;
};

// Modal de exportar o Stood: um check por tipo que o Stood tem, todos marcados; monta já aberto e desmonta ao fechar
export function ExportDialog({ stoodName, tree, typeCounts, getContent, onClose }: ExportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selected, setSelected] = useState<ExportType[]>(() => typeCounts.map((typeCount) => typeCount.type));
  const [isFailed, setIsFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function toggle(type: ExportType) {
    setIsFailed(false);
    setSelected((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const archive = await buildStoodArchive(buildExportEntries(tree, selected), getContent);
        downloadFile(archive, buildExportZipName(stoodName));
        dialogRef.current?.close();
      } catch (error) {
        console.error("stood export failed", error);
        setIsFailed(true);
      }
    });
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onClose={onClose} className={DIALOG}>
      <form onSubmit={submit} className="grid w-md max-w-full gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium tracking-tight">
            Exportar Stood
          </h2>
          <button type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()} className={ICON_BUTTON}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-ui text-text-muted">
            Escolha o que vai no .zip. As Pastas do Stood viram pastas dentro dele, e os Vídeos ficam de fora.
          </legend>
          {typeCounts.map(({ type, count }) => {
            const label = TYPE_LABELS[type];
            return (
              <label key={type} className="flex cursor-pointer items-center gap-2 text-ui">
                <input
                  type="checkbox"
                  checked={selected.includes(type)}
                  onChange={() => toggle(type)}
                  className={`size-4 flex-none accent-accent ${FOCUS}`}
                />
                <span className="flex-1">
                  {count} {count === 1 ? label.one : label.many}
                </span>
                <span className="font-mono text-meta text-text-muted">{label.format}</span>
              </label>
            );
          })}
        </fieldset>

        {isFailed && <FormMessage tone="error">{EXPORT_FAILED_MESSAGE}</FormMessage>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.secondary}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || selected.length === 0}
            className={`${BUTTON.base} ${BUTTON.md} ${BUTTON.primary}`}
          >
            {isPending ? "Exportando…" : "Exportar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
