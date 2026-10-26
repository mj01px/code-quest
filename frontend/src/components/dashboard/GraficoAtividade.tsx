import { TIPO } from "@/lib/tipografia";

// Coordenadas no espaço do viewBox: o SVG escala com a largura do card.
const LARGURA = 700;
const ALTURA = 260;
const TOPO = 30;
const BASE = 220;
// Só as chaves numéricas de T: `chave: "dia"` não compila.
type ChaveNumerica<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T] &
  string;

export interface Serie<T> {
  chave: ChaveNumerica<T>;
  cor: string;
  nome: string;
}

/** Barras verticais por dia, uma por série, proporcionais ao maior valor. */
export function GraficoAtividade<T extends { dia: string; data: string }>({
  dias,
  series,
  titulo,
  rotulo = "Últimos 7 dias",
}: {
  dias: T[];
  series: Serie<T>[];
  titulo: string;
  rotulo?: string;
}) {
  const valor = (d: T, s: Serie<T>) => d[s.chave] as number;
  const coluna = LARGURA / Math.max(dias.length, 1);
  const grupo = coluna * 0.6;
  // Semana zerada: divide por 1 e nenhuma barra sobe, sem NaN no atributo.
  const maximo = Math.max(1, ...dias.flatMap((d) => series.map((s) => valor(d, s))));
  const resumo = dias
    .map((d) => `${d.dia}: ${series.map((s) => `${valor(d, s)} ${s.nome}`).join(" e ")}`)
    .join(", ");
  const barra = grupo / series.length;

  return (
    <figure className="m-0 flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={`${TIPO.tituloSecao} m-0 text-ink`}>{titulo}</h2>
        {series.length > 1 ? (
          <span className="flex gap-4" aria-hidden="true">
            {series.map((s) => (
              <span
                key={s.chave}
                className={`${TIPO.etiqueta} flex items-center gap-2 text-ink-muted`}
              >
                <span className="h-2.5 w-2.5" style={{ background: s.cor }} />
                {s.nome.toUpperCase()}
              </span>
            ))}
          </span>
        ) : null}
      </figcaption>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={`${rotulo}. ${resumo}`}
        className="block h-auto w-full"
      >
        <line
          x1={0}
          x2={LARGURA}
          y1={BASE}
          y2={BASE}
          stroke="currentColor"
          strokeWidth={2}
          className="text-edge-soft"
        />
        {dias.map((d, i) => {
          const inicio = i * coluna + (coluna - grupo) / 2;

          return (
            <g key={d.data}>
              {series.map((s, j) => {
                const altura = ((BASE - TOPO) * valor(d, s)) / maximo;
                const x = inicio + j * barra;
                return (
                  <g key={s.chave}>
                    <rect
                      x={x}
                      y={BASE - altura}
                      width={barra}
                      height={altura}
                      fill={s.cor}
                    />
                    <text
                      x={x + barra / 2}
                      y={BASE - altura - 8}
                      textAnchor="middle"
                      className="fill-ink font-label text-[18px]"
                    >
                      {valor(d, s)}
                    </text>
                  </g>
                );
              })}
              <text
                x={i * coluna + coluna / 2}
                y={BASE + 30}
                textAnchor="middle"
                className="fill-ink-muted font-label text-[18px]"
              >
                {d.dia}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
