import Link from "next/link";
import type { ReactNode } from "react";

export function BarraDeFoco({
  sairHref,
  centro,
  placar,
}: {
  sairHref: string;
  centro?: ReactNode;
  placar?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 border-b-[3px] border-edge bg-panel-deep px-4 py-3 sm:px-8">
      <Link
        href={sairHref}
        className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase hover:text-brand-light"
      >
        &lt; Sair
      </Link>
      {centro ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center sm:flex">
          <span className="pointer-events-auto max-w-[50%] truncate font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
            {centro}
          </span>
        </div>
      ) : null}
      {placar ? <div className="ml-auto flex items-center gap-4">{placar}</div> : null}
    </header>
  );
}
