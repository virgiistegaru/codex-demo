import type { ReactNode } from "react";
import { NotesSection } from "@/src/components/notes-section";

export default function NotesLayout({ children }: { children: ReactNode }) {
  return <NotesSection>{children}</NotesSection>;
}
