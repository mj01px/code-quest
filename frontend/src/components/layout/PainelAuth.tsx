import Image from "next/image";
import type { ReactNode } from "react";

interface Props {
  titulo: ReactNode;
  linhaTerminal: string;
  formulario: ReactNode;
  sprite?: string;
  spriteAlt?: string;
  // Alternativa ao sprite: arte vetorial desenhada na mesma moldura.
  ilustracao?: ReactNode;
  // Etiqueta curta sob a moldura, para o prazo de validade do link.
  selo?: string;
  tituloLateral?: string;
  textoLateral?: string;
  acaoLateral?: ReactNode;
}

export function PainelAuth({
  titulo,
  linhaTerminal,
  formulario,
  sprite,
  spriteAlt,
  ilustracao,
  selo,
  tituloLateral,
  textoLateral,
  acaoLateral,
}: Props) {
  const lateral = Boolean(sprite || ilustracao);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-[820px] flex-wrap border-[3px] border-brand bg-panel shadow-frame">
        <section
          className={`flex min-w-[260px] flex-col gap-5 bg-panel-deep px-5 py-8 sm:px-8 sm:py-10 ${
            lateral
              ? "flex-[1_1_340px] border-r-[3px] border-edge"
              : "flex-[1_1_100%]"
          }`}
        >
          <div className="flex flex-col gap-4">
            <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
              {titulo}
            </h1>
            <p className="m-0 flex items-center gap-2 font-body text-lg leading-[1.6] tracking-[1px] text-ink-body">
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center border-2 border-brand-shadow font-label text-[8px] text-brand-light"
              >
                &gt;
              </span>
              <span>{linhaTerminal}</span>
              <span
                aria-hidden="true"
                className="inline-block h-[14px] w-[7px] shrink-0 animate-blink bg-brand"
              />
            </p>
          </div>

          {formulario}
        </section>

        {lateral ? (
        <section className="flex min-w-[240px] flex-[1_1_280px] flex-col items-center justify-center gap-5 bg-panel-soft px-6 py-10 text-center">
          <div className="relative flex h-[148px] w-[148px] items-center justify-center overflow-hidden border-2 border-brand-shadow bg-panel shadow-halo">
            {sprite ? (
              <Image
                src={sprite}
                alt={spriteAlt ?? ""}
                width={120}
                height={120}
                priority
                className="block h-[120px] w-[120px]"
              />
            ) : (
              ilustracao
            )}
          </div>

          {selo ? (
            <p className="m-0 border-2 border-edge-soft bg-field px-2.5 py-1.5 font-label text-[10px] leading-[1.6] tracking-[2px] text-ink-muted">
              {selo}
            </p>
          ) : null}

          {tituloLateral || textoLateral ? (
            <div className="flex flex-col items-center gap-3">
              {tituloLateral ? (
                <h2 className="m-0 font-display text-[14px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
                  {tituloLateral}
                </h2>
              ) : null}
              {textoLateral ? (
                <p className="m-0 max-w-[330px] font-body text-lg leading-[1.8] tracking-[1px] text-ink-body text-pretty">
                  {textoLateral}
                </p>
              ) : null}
            </div>
          ) : null}

          {acaoLateral}
        </section>
        ) : null}
      </div>
    </main>
  );
}
