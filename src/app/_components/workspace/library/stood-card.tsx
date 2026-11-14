import { Brain } from "lucide-react";
import { CARD, FOCUS } from "@/app/_components/ui";
import { FILE_TYPE_LABELS, FILE_TYPE_ORDER, FileTypeIcon } from "@/app/_components/workspace/file-type-icon";
import type { FileType } from "@/lib/stood/tree";

type StoodCardProps = {
  id: string;
  name: string;
  description: string | null;
  fileCounts: Record<FileType, number>;
  openedAgo: string;
};

// Cartão de "Continuar de onde parou": ícone, nome, descrição em 2 linhas, Arquivos por tipo e há quanto tempo abriu
export function StoodCard({ id, name, description, fileCounts, openedAgo }: StoodCardProps) {
  const typesWithFiles = FILE_TYPE_ORDER.filter((type) => fileCounts[type] > 0);

  return (
    <a href={`/stood/${id}`} className={`${CARD} ${FOCUS} flex flex-col gap-3 bg-surface p-4 hover:bg-surface-2`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 flex-none place-items-center rounded-md bg-accent/12">
          <Brain size={18} strokeWidth={1.75} aria-hidden className="text-accent-text" />
        </span>
        <strong className="truncate font-medium">{name}</strong>
      </div>

      <p className="line-clamp-2 min-h-10 text-ui text-text-muted">{description ?? "Sem descrição."}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-meta text-text-muted">
        {typesWithFiles.length > 0 ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Arquivos por tipo">
            {typesWithFiles.map((type) => (
              <li key={type} className="flex items-center gap-1" title={FILE_TYPE_LABELS[type]}>
                <FileTypeIcon type={type} size={13} />
                <span>
                  {fileCounts[type]}
                  <span className="sr-only"> {FILE_TYPE_LABELS[type]}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span>Nenhum Arquivo</span>
        )}
        <span className="ml-auto">{openedAgo}</span>
      </div>
    </a>
  );
}
