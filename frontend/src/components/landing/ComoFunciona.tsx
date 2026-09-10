import { PASSOS } from "./dados";
import { TituloSecao } from "./TituloSecao";

export function ComoFunciona() {
  return (
    <section id="como" className="border-b-2 border-edge">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 py-20 sm:px-8">
        <TituloSecao rotulo="COMO FUNCIONA" titulo="Três fases, um loop" />

        <ol className="grid list-none gap-6 p-0 lg:grid-cols-3">
          {PASSOS.map((passo) => (
            <li
              key={passo.numero}
              className="flex flex-col gap-4 border-2 border-edge bg-panel p-7 shadow-pixel transition-none hover:border-brand-strong hover:-translate-y-1"
            >
              <span className="inline-flex w-fit items-center bg-brand-strong px-2.5 py-1 font-display text-[12px] text-ink">
                {passo.numero}
              </span>
              <h3 className="m-0 font-display text-[14px] leading-[1.6] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
                {passo.titulo}
              </h3>
              <p className="m-0 font-body text-[19px] leading-[1.4] text-ink-body text-pretty">
                {passo.texto}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
