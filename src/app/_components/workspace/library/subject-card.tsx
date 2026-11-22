import { STOOD_CARD, StoodCardBody } from "@/app/_components/workspace/library/stood-card";
import { StoodDialog } from "@/app/_components/workspace/stood-dialog";

type SubjectCardProps = { slug: string; name: string; description: string; videoCount: number };

// Cartão de uma Matéria, no mesmo formato do Stood; o clique abre o diálogo que copia a Matéria para um Stood do Usuário
export function SubjectCard({ slug, name, description, videoCount }: SubjectCardProps) {
  return (
    <StoodDialog
      mode="subject"
      subjectSlug={slug}
      details={{ name, description }}
      triggerLabel={`Criar Stood a partir de ${name}`}
      triggerClassName={STOOD_CARD}
    >
      <StoodCardBody icon="subject" name={name} description={description} fileCounts={{ video: videoCount }} />
    </StoodDialog>
  );
}
