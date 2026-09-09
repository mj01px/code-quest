import type { ReactNode } from "react";

export function ADefinir({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5 border-2 border-dashed border-danger-deep bg-panel-soft px-2 py-0.5">
      <span className="font-label text-[9px] tracking-[2px] text-danger">
        A DEFINIR
      </span>
      <span className="text-ink-muted">{children}</span>
    </span>
  );
}
