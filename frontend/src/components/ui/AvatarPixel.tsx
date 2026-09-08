// Espaço reservado para o mascote, até o módulo de criaturas chegar.

const VERDE = "#4fc98a";
const VERDE_ESCURO = "#2f8d60";
const CASCA = "#efe9dc";
const CASCA_SOMBRA = "#c9c2b4";
const ESCURO = "#0e0a15";

/** Cada item é [x, y, largura] numa grade de 16 por 16. */
const CABECA: [number, number, number][] = [
  [5, 3, 6],
  [4, 4, 8],
  [4, 5, 8],
  [4, 6, 8],
  [4, 7, 8],
  [5, 8, 6],
];

const OVO: [number, number, number][] = [
  [3, 9, 10],
  [3, 10, 10],
  [3, 11, 10],
  [3, 12, 10],
  [4, 13, 8],
  [5, 14, 6],
];

export function AvatarPixel({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      shapeRendering="crispEdges"
      className={className}
    >
      {CABECA.map(([x, y, largura]) => (
        <rect key={`c${y}`} x={x} y={y} width={largura} height="1" fill={VERDE} />
      ))}
      <rect x="4" y="8" width="1" height="1" fill={VERDE_ESCURO} />
      <rect x="11" y="8" width="1" height="1" fill={VERDE_ESCURO} />
      <rect x="6" y="5" width="1" height="2" fill={ESCURO} />
      <rect x="9" y="5" width="1" height="2" fill={ESCURO} />

      {OVO.map(([x, y, largura]) => (
        <rect key={`o${y}`} x={x} y={y} width={largura} height="1" fill={CASCA} />
      ))}
      <rect x="4" y="9" width="1" height="1" fill={VERDE} />
      <rect x="7" y="9" width="1" height="1" fill={VERDE} />
      <rect x="10" y="9" width="1" height="1" fill={VERDE} />
      <rect x="4" y="12" width="2" height="1" fill={CASCA_SOMBRA} />
      <rect x="10" y="12" width="2" height="1" fill={CASCA_SOMBRA} />
      <rect x="5" y="14" width="6" height="1" fill={CASCA_SOMBRA} />
    </svg>
  );
}
