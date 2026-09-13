interface Props {
  readonly nivel: number;
  readonly nome: string;
  readonly atual: number;
  readonly total: number;
  readonly blocos?: number;
}

export function BarraXP({ nivel, nome, atual, total, blocos = 10 }: Props) {
  const preenchidos = Math.round((atual / total) * blocos);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between font-label text-[10px] tracking-[0.18em] text-ink-muted">
        <span>
          NÍVEL {nivel} · {nome.toUpperCase()}
        </span>
        <span className="text-brand-light">
          {atual} / {total} XP
        </span>
      </div>

      <div
        className="flex gap-1 border-2 border-edge-soft bg-panel-deep p-1"
        role="progressbar"
        aria-valuenow={atual}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Progresso de ${nome}: nível ${nivel}`}
      >
        {Array.from({ length: blocos }, (_, indice) => (
          <span
            key={indice}
            className={`h-3 flex-1 ${
              indice < preenchidos ? "bg-brand" : "bg-edge"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
