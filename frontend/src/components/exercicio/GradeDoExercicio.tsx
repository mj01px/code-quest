import type { ReactNode } from "react";

export function CabecalhoDoPainel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-edge bg-panel-deep px-4 py-3 font-label text-[11px] tracking-[2px] uppercase">
      {children}
    </div>
  );
}

export function GradeDoExercicio({
  aprender,
  centro,
  direita,
  pet,
}: {
  aprender: ReactNode;
  centro: ReactNode;
  direita?: ReactNode;
  pet?: ReactNode;
}) {
  const canto = pet ? (
    <div className="pointer-events-none absolute right-4 -bottom-3 z-10 [&>*]:pointer-events-auto">
      {pet}
    </div>
  ) : null;

  return (
    <div
      className={`grid bg-panel lg:min-h-0 lg:flex-1 lg:divide-x-2 lg:divide-edge ${
        direita
          ? "lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1.25fr)_minmax(18rem,1fr)]"
          : "lg:grid-cols-[minmax(20rem,1fr)_minmax(0,2.25fr)]"
      }`}
    >
      <section aria-label="Aprender" className="relative flex min-h-0 flex-col border-b-2 border-edge lg:border-b-0">
        <CabecalhoDoPainel>
          <span className="flex items-center gap-2 text-ink">
            <span aria-hidden="true" className="h-2.5 w-2.5 bg-brand" />
            Aprender
          </span>
        </CabecalhoDoPainel>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-2">
          {aprender}
        </div>
        {canto}
      </section>
      <section
        aria-label="Editor"
        className="flex min-h-0 flex-col border-b-2 border-edge lg:border-b-0"
      >
        {centro}
      </section>
      {direita ? (
        <section aria-label="Terminal" className="flex min-h-0 flex-col">
          {direita}
        </section>
      ) : null}
    </div>
  );
}
