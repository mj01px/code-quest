interface Props {
  size?: number;
}

function base(size: number) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "square" as const,
    "aria-hidden": true,
  };
}

export function IconeLupa({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="4" width="12" height="12" />
      <path d="M16 16l5 5" />
    </svg>
  );
}

export function IconeSetaEsquerda({ size = 14 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconeSetaDireita({ size = 14 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconeCadeado({ size = 14 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V7h8v4" />
    </svg>
  );
}

export function IconeGlobo({ size = 20 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  );
}

export function IconeLapis({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13 6l5 5" />
    </svg>
  );
}

export function IconeElo({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M9 15l6-6" />
      <path d="M8 11l-2 2a3 3 0 0 0 4 4l2-2" />
      <path d="M16 13l2-2a3 3 0 0 0-4-4l-2 2" />
    </svg>
  );
}

export function IconeCopiar({ size = 14 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="8" y="8" width="12" height="12" />
      <path d="M4 16V4h12" />
    </svg>
  );
}

export function IconeConfere({ size = 14 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export function IconeReticencias({ size = 18 }: Props) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none">
      <rect x="11" y="4" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
      <rect x="11" y="18" width="2" height="2" />
    </svg>
  );
}
