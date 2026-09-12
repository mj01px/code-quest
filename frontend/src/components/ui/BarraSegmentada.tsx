// Barra de progresso em blocos, usada em XP, trilha e avaliação.

export function BarraSegmentada({
  valor,
  segmentos = 8,
  rotulo,
  compacta = false,
  semMoldura = false,
  expandida = false,
  alta = false,
}: {
  /** 0 a 100. */
  valor: number;
  segmentos?: number;
  /** Descrição para leitor de tela; sem ela a barra é decorativa. */
  rotulo?: string;
  compacta?: boolean;
  semMoldura?: boolean;
  /** Ocupa toda a largura disponível. */
  expandida?: boolean;
  /** Blocos mais altos, sem mexer na largura. Só vale com `expandida`. */
  alta?: boolean;
}) {
  const limitado = Math.min(100, Math.max(0, valor));
  const preenchidos = Math.round((limitado / 100) * segmentos);

  const acessibilidade = rotulo
    ? ({
        role: "progressbar" as const,
        "aria-valuenow": Math.round(limitado),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-label": rotulo,
      } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      {...acessibilidade}
      className={`items-center gap-[2px] ${
        expandida ? "flex w-full" : "inline-flex"
      } ${semMoldura ? "" : "border border-edge-soft bg-void p-[3px]"}`}
    >
      {Array.from({ length: segmentos }, (_, indice) => (
        <span
          key={indice}
          className={`${
            expandida
              ? `${alta ? "h-3.5" : "h-2.5"} flex-1`
              : compacta
                ? "h-2 w-2"
                : "h-2.5 w-3"
          } ${
            indice < preenchidos ? "bg-brand-strong" : "bg-edge/70"
          } transition-colors duration-300`}
        />
      ))}
    </span>
  );
}
