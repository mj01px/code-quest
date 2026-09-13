// Ilustrações das telas de auth, em grade de 20 células (1 célula = 6px em 120px).
// Cada retângulo é um pixel da arte, no mesmo traço dos ícones de 16px.

const BASE = "block h-[120px] w-[120px]";

interface Props {
  className?: string;
}

function Arte({ children, className = "" }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      shapeRendering="crispEdges"
      className={`${BASE} ${className}`.trim()}
    >
      {children}
    </svg>
  );
}

export function ArteEnvelope({
  apagada = false,
  className = "",
}: Props & { apagada?: boolean }) {
  const borda = apagada ? "fill-edge-soft" : "fill-brand";
  const aba = apagada ? "fill-ink-dim" : "fill-brand-light";

  return (
    <Arte className={className}>
      <rect x="2" y="5" width="16" height="10" className="fill-panel-deep" />
      <rect x="2" y="5" width="16" height="1" className={borda} />
      <rect x="2" y="14" width="16" height="1" className={borda} />
      <rect x="2" y="5" width="1" height="10" className={borda} />
      <rect x="17" y="5" width="1" height="10" className={borda} />
      <rect x="3" y="6" width="2" height="1" className={aba} />
      <rect x="5" y="7" width="2" height="1" className={aba} />
      <rect x="7" y="8" width="2" height="1" className={aba} />
      <rect x="9" y="9" width="2" height="1" className={aba} />
      <rect x="11" y="8" width="2" height="1" className={aba} />
      <rect x="13" y="7" width="2" height="1" className={aba} />
      <rect x="15" y="6" width="2" height="1" className={aba} />
    </Arte>
  );
}

// Envelope sendo lido, com a linha de varredura passando por cima. Depende de
// um pai com position relative e overflow escondido (a caixa do PainelAuth).
export function ArteEnvelopeLendo() {
  return (
    <>
      <ArteEnvelope apagada />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-0.5 animate-varredura bg-brand/75"
      />
    </>
  );
}

export function ArteChave({ className = "" }: Props) {
  return (
    <Arte className={className}>
      <rect x="3" y="7" width="6" height="1" className="fill-brand-light" />
      <rect x="3" y="12" width="6" height="1" className="fill-brand-light" />
      <rect x="3" y="7" width="1" height="6" className="fill-brand-light" />
      <rect x="8" y="7" width="1" height="6" className="fill-brand-light" />
      <rect x="9" y="9" width="8" height="2" className="fill-brand" />
      <rect x="14" y="11" width="1" height="2" className="fill-brand" />
      <rect x="16" y="11" width="1" height="2" className="fill-brand" />
    </Arte>
  );
}

export function ArteCadeado({ className = "" }: Props) {
  return (
    <Arte className={className}>
      <rect x="7" y="5" width="6" height="1" className="fill-brand-light" />
      <rect x="7" y="6" width="1" height="3" className="fill-brand-light" />
      <rect x="12" y="6" width="1" height="3" className="fill-brand-light" />
      <rect x="5" y="9" width="10" height="8" className="fill-brand" />
      <rect x="6" y="10" width="8" height="6" className="fill-panel-deep" />
      <rect x="9" y="12" width="2" height="2" className="fill-brand-light" />
    </Arte>
  );
}

export function ArteConfirmado({ className = "" }: Props) {
  return (
    <Arte className={className}>
      <rect x="4" y="10" width="2" height="2" className="fill-success" />
      <rect x="6" y="12" width="2" height="2" className="fill-success" />
      <rect x="8" y="14" width="2" height="2" className="fill-success" />
      <rect x="10" y="12" width="2" height="2" className="fill-success" />
      <rect x="12" y="10" width="2" height="2" className="fill-success" />
      <rect x="14" y="8" width="2" height="2" className="fill-success" />
      <rect x="16" y="6" width="2" height="2" className="fill-success" />
    </Arte>
  );
}

export function ArteLinkInvalido({ className = "" }: Props) {
  return (
    <Arte className={className}>
      <rect x="5" y="5" width="2" height="2" className="fill-danger" />
      <rect x="7" y="7" width="2" height="2" className="fill-danger" />
      <rect x="9" y="9" width="2" height="2" className="fill-danger" />
      <rect x="11" y="11" width="2" height="2" className="fill-danger" />
      <rect x="13" y="13" width="2" height="2" className="fill-danger" />
      <rect x="13" y="5" width="2" height="2" className="fill-danger" />
      <rect x="11" y="7" width="2" height="2" className="fill-danger" />
      <rect x="7" y="11" width="2" height="2" className="fill-danger" />
      <rect x="5" y="13" width="2" height="2" className="fill-danger" />
    </Arte>
  );
}
