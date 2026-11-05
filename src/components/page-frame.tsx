import type { ReactNode } from "react";

export function PageFrame({
  area,
  children,
  className,
}: {
  area: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={className ? `page-frame ${className}` : "page-frame"}>
      <p className="page-area">{area}</p>
      {children}
    </main>
  );
}
