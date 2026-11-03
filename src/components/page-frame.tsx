import type { ReactNode } from "react";

export function PageFrame({
  area,
  children,
}: {
  area: string;
  children: ReactNode;
}) {
  return (
    <main className="page-frame">
      <p className="page-area">{area}</p>
      {children}
    </main>
  );
}
