import type { ReactNode } from "react";

type NotesSectionProps = {
  children: ReactNode;
};

export function NotesSection({ children }: NotesSectionProps) {
  return (
    <section aria-label="Notes section">
      <header>
        <p>TinyNotes</p>
        <p>Notes area placeholder.</p>
      </header>
      {children}
    </section>
  );
}
