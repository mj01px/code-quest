import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";

export function BlocoAprender({
  cabecalho,
  titulo,
  contexto,
  enunciado,
  xp,
}: {
  cabecalho: string;
  titulo: string;
  contexto: string;
  enunciado: string;
  xp: number;
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="m-0 font-label text-[11px] tracking-[2px] text-brand-light uppercase">
          {cabecalho}
        </p>
        <h1 className="m-0 font-display text-[15px] leading-[1.6] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[16px]">
          {titulo}
        </h1>
      </div>

      {contexto ? (
        <ConteudoDaLicao markdown={contexto} tamanho="medio" />
      ) : null}

      <section
        aria-label="Sua missão"
        className="flex flex-col gap-2 border-2 border-brand-shadow bg-panel-deep p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase">
            Sua missão
          </span>
          <span className="flex items-center gap-2 font-label text-[10px] tracking-[2px] text-ink-muted uppercase">
            <span aria-hidden="true" className="h-2.5 w-2.5 bg-brand" />+{xp} XP
          </span>
        </div>
        <ConteudoDaLicao markdown={enunciado} tamanho="medio" />
      </section>
    </>
  );
}
