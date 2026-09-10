import { TituloSecao } from "./TituloSecao";

export function Cli() {
  return (
    <section id="cli" className="border-b-2 border-edge bg-panel-deep/40">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-12 px-5 py-20 sm:px-8">
        <TituloSecao rotulo="TERMINAL INTEGRADO" titulo="Treine na CLI">
          Sem editor de brinquedo: você escreve comandos reais e vê o resultado
          como um dev vê.
        </TituloSecao>

        <div className="w-full border-[3px] border-brand-strong bg-panel-deep shadow-frame">
          <div className="flex items-center justify-between border-b-2 border-edge bg-panel-soft px-4 py-2.5">
            <span className="font-label text-[10px] tracking-[0.15em] text-ink-muted">
              codequest@os: ~/quest-01
            </span>
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 bg-edge-soft" />
              <span className="h-2.5 w-2.5 bg-brand-strong" />
              <span className="h-2.5 w-2.5 bg-brand" />
            </span>
          </div>

          <div className="flex flex-col gap-2 px-5 py-6 font-body text-[19px] leading-[1.6] [overflow-wrap:anywhere]">
            <p className="m-0">
              <span className="text-brand-light">$</span> cq start fundamentos
              --pet shellby
            </p>
            <p className="m-0">
              <span className="text-success">OK</span>{" "}
              <span className="text-ink-body">
                Fase 01 carregada: &quot;Loops e listas&quot;
              </span>
            </p>
            <p className="m-0">
              <span className="text-brand-light">$</span> cq run soma_pares.py
            </p>
            <p className="m-0 text-success">
              PASS 4/4 testes · +120 XP · Shellby subiu para o nível 3
            </p>
            <p className="m-0 text-brand-light">
              ${" "}
              <span className="inline-block h-4 w-2.5 bg-brand-light align-middle animate-blink" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
