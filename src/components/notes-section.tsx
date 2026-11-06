import type { ReactNode } from "react";
import { PageFrame } from "@/src/components/page-frame";

type NotesSectionProps = {
  children: ReactNode;
};

export function NotesSection({ children }: NotesSectionProps) {
  return (
    <PageFrame area="PRIVATE AREA" className="notes-area-frame">
      {children}
    </PageFrame>
  );
}
