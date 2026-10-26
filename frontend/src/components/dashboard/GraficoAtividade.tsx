import type { AtividadeDia } from "@/lib/types";

// Coordenadas no espaço do viewBox: o SVG escala com a largura do card.
const LARGURA = 700;
const ALTURA = 260;
const TOPO = 30;
const BASE = 220;
const COLUNA = LARGURA / 7;
const BARRA = COLUNA * 0.55;

/** Barras verticais do XP por dia, proporcionais ao maior dia da semana. */
export function GraficoAtividade({ dias }: { dias: AtividadeDia[] }) {
  // Semana zerada: divide por 1 e nenhuma barra sobe, sem NaN no atributo.
  const maximo = Math.max(1, ...dias.map((d) => d.xp));
  const resumo = dias.map((d) => `${d.dia}: ${d.xp} XP`).join(", ");

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={`XP por dia nos últimos 7 dias. ${resumo}`}
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
        const altura = ((BASE - TOPO) * d.xp) / maximo;
        const x = i * COLUNA + (COLUNA - BARRA) / 2;
        const centro = i * COLUNA + COLUNA / 2;

        return (
          <g key={d.data}>
            <rect
              x={x}
              y={BASE - altura}
              width={BARRA}
              height={altura}
              fill="#A855F7"
            />
            <text
              x={centro}
              y={BASE - altura - 8}
              textAnchor="middle"
              className="fill-ink font-label text-[18px]"
            >
              {d.xp}
            </text>
            <text
              x={centro}
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
  );
}
