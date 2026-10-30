import { TIPO } from "@/lib/tipografia";

export const CARD =
  "flex flex-col gap-3 border-[3px] border-edge-soft bg-panel p-5 shadow-[6px_6px_0_#000]";

export interface Numero {
  rotulo: string;
  valor: number;
  sufixo?: string;
}

/** Os big numbers dos dashboards: 1 coluna no celular, 2 no meio, 4 no largo. */
export function CartoesNumeros({ numeros }: { numeros: Numero[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
      {numeros.map((n) => (
        <li key={n.rotulo} className={CARD}>
          <span className={`${TIPO.etiqueta} text-ink-muted`}>{n.rotulo}</span>
          <span className="font-display text-[28px] leading-none text-ink">
            {n.valor.toLocaleString("pt-BR")}
            {n.sufixo ? (
              <span className={`${TIPO.etiqueta} ml-2 text-brand-light`}>
                {n.sufixo}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
