import { Brain, GraduationCap } from "lucide-react";
import { CARD, FOCUS } from "@/app/_components/ui";
import { FILE_TYPE_LABELS, FILE_TYPE_ORDER, FileTypeIcon } from "@/app/_components/workspace/file-type-icon";
import type { FileType } from "@/lib/stood/tree";

// Classes do cartão clicável, iguais no link do Stood e no botão da Matéria
export const STOOD_CARD = `${CARD} ${FOCUS} flex w-full cursor-pointer flex-col gap-3 bg-surface p-4 text-left hover:bg-surface-2`;

type StoodCardBodyProps = {
  icon: "stood" | "subject";
  name: string;
  description: string | null;
  fileCounts: Partial<Record<FileType, number>>;
  meta?: string;
};

type StoodCardProps = Omit<StoodCardBodyProps, "icon" | "meta"> & { id: string; openedAgo: string };

const ICONS = { stood: Brain, subject: GraduationCap };

// Cartão de "Continuar de onde parou": ícone, nome, descrição em 2 linhas, Arquivos por tipo e há quanto tempo abriu
export function StoodCard({ id, openedAgo, ...body }: StoodCardProps) {
  return (
    <a href={`/stood/${id}`} className={STOOD_CARD}>
      <StoodCardBody icon="stood" meta={openedAgo} {...body} />
    </a>
  );
}

// Só span por dentro, porque o cartão da Matéria é um botão e botão não aceita bloco nem lista
export function StoodCardBody({ icon, name, description, fileCounts, meta }: StoodCardBodyProps) {
  const Icon = ICONS[icon];
  const typesWithFiles = FILE_TYPE_ORDER.filter((type) => (fileCounts[type] ?? 0) > 0);

  return (
    <>
      <span className="flex items-center gap-3">
        <span className="grid size-9 flex-none place-items-center rounded-md bg-accent/12">
          <Icon size={18} strokeWidth={1.75} aria-hidden className="text-accent-text" />
        </span>
        <strong className="truncate font-medium">{name}</strong>
      </span>

      <span className="line-clamp-2 min-h-10 text-ui text-text-muted">{description ?? "Sem descrição."}</span>

      <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-meta text-text-muted">
        {typesWithFiles.length > 0 ? (
          typesWithFiles.map((type) => (
            <span key={type} className="flex items-center gap-1" title={FILE_TYPE_LABELS[type]}>
              <FileTypeIcon type={type} size={13} />
              <span>
                {fileCounts[type]}
                <span className="sr-only"> {FILE_TYPE_LABELS[type]}</span>
              </span>
            </span>
          ))
        ) : (
          <span>Nenhum Arquivo</span>
        )}
        {meta && <span className="ml-auto">{meta}</span>}
      </span>
    </>
  );
}
