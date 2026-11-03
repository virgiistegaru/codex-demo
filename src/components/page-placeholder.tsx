import { PageCard } from "@/src/components/page-card";
import { PageFrame } from "@/src/components/page-frame";

type PagePlaceholderProps = {
  title: string;
  description: string;
  area?: string;
  note?: string;
};

export function PagePlaceholder({
  title,
  description,
  area = "PUBLIC AREA",
  note,
}: PagePlaceholderProps) {
  return (
    <PageFrame area={area}>
      <PageCard title={title} description={description} note={note} />
    </PageFrame>
  );
}
