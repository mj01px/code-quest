// Ícones em grade de 16px, no traço pixelado das telas.

const BASE = "shrink-0";

export function IconeLupa({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="2" width="8" height="8" />
      <path d="M10 10l4 4" />
    </svg>
  );
}

export function IconeMenu({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="currentColor"
    >
      <rect x="2" y="3" width="12" height="2" />
      <rect x="2" y="7" width="12" height="2" />
      <rect x="2" y="11" width="12" height="2" />
    </svg>
  );
}

export function IconeLapis({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M11 2l3 3-8 8H3v-3z" />
      <path d="M9 4l3 3" />
    </svg>
  );
}

export function IconeLixeira({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 4h12M6 4V2h4v2" />
      <path d="M4 4l1 10h6l1-10" />
      <path d="M7 7v4M9 7v4" />
    </svg>
  );
}

export function IconeCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

export function IconeAjuda({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1.5" y="1.5" width="13" height="13" />
      <path d="M6 6V4.75h4V8H8v2" />
      <rect x="7.25" y="11.25" width="1.5" height="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeEngrenagemPixel({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="24"
      height="24"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      <rect x="6" y="0" width="4" height="1" />
      <rect x="6" y="1" width="4" height="1" />
      <rect x="3" y="2" width="2" height="1" />
      <rect x="6" y="2" width="4" height="1" />
      <rect x="11" y="2" width="2" height="1" />
      <rect x="2" y="3" width="12" height="1" />
      <rect x="2" y="4" width="12" height="1" />
      <rect x="3" y="5" width="10" height="1" />
      <rect x="0" y="6" width="6" height="1" />
      <rect x="10" y="6" width="6" height="1" />
      <rect x="0" y="7" width="6" height="1" />
      <rect x="10" y="7" width="6" height="1" />
      <rect x="0" y="8" width="6" height="1" />
      <rect x="10" y="8" width="6" height="1" />
      <rect x="0" y="9" width="6" height="1" />
      <rect x="10" y="9" width="6" height="1" />
      <rect x="3" y="10" width="10" height="1" />
      <rect x="2" y="11" width="12" height="1" />
      <rect x="2" y="12" width="12" height="1" />
      <rect x="3" y="13" width="2" height="1" />
      <rect x="6" y="13" width="4" height="1" />
      <rect x="11" y="13" width="2" height="1" />
      <rect x="6" y="14" width="4" height="1" />
      <rect x="6" y="15" width="4" height="1" />
      <g fill="#ffffff" fillOpacity="0.45">
        <rect x="6" y="0" width="4" height="1" />
        <rect x="6" y="1" width="1" height="1" />
        <rect x="3" y="2" width="2" height="1" />
        <rect x="6" y="2" width="1" height="1" />
        <rect x="11" y="2" width="2" height="1" />
        <rect x="2" y="3" width="1" height="1" />
        <rect x="5" y="3" width="1" height="1" />
        <rect x="10" y="3" width="1" height="1" />
        <rect x="2" y="4" width="1" height="1" />
        <rect x="3" y="5" width="1" height="1" />
        <rect x="0" y="6" width="3" height="1" />
        <rect x="10" y="6" width="1" height="1" />
        <rect x="13" y="6" width="2" height="1" />
        <rect x="0" y="7" width="1" height="1" />
        <rect x="10" y="7" width="1" height="1" />
        <rect x="0" y="8" width="1" height="1" />
        <rect x="10" y="8" width="1" height="1" />
        <rect x="0" y="9" width="1" height="1" />
        <rect x="10" y="9" width="1" height="1" />
        <rect x="3" y="10" width="1" height="1" />
        <rect x="6" y="10" width="4" height="1" />
        <rect x="2" y="11" width="1" height="1" />
        <rect x="2" y="12" width="1" height="1" />
        <rect x="6" y="13" width="1" height="1" />
        <rect x="6" y="14" width="1" height="1" />
      </g>
      <g fill="#000000" fillOpacity="0.35">
        <rect x="9" y="1" width="1" height="1" />
        <rect x="9" y="2" width="1" height="1" />
        <rect x="13" y="3" width="1" height="1" />
        <rect x="13" y="4" width="1" height="1" />
        <rect x="6" y="5" width="4" height="1" />
        <rect x="12" y="5" width="1" height="1" />
        <rect x="5" y="6" width="1" height="1" />
        <rect x="15" y="6" width="1" height="1" />
        <rect x="5" y="7" width="1" height="1" />
        <rect x="15" y="7" width="1" height="1" />
        <rect x="5" y="8" width="1" height="1" />
        <rect x="15" y="8" width="1" height="1" />
        <rect x="1" y="9" width="2" height="1" />
        <rect x="5" y="9" width="1" height="1" />
        <rect x="13" y="9" width="3" height="1" />
        <rect x="12" y="10" width="1" height="1" />
        <rect x="13" y="11" width="1" height="1" />
        <rect x="5" y="12" width="1" height="1" />
        <rect x="10" y="12" width="1" height="1" />
        <rect x="13" y="12" width="1" height="1" />
        <rect x="3" y="13" width="2" height="1" />
        <rect x="9" y="13" width="1" height="1" />
        <rect x="11" y="13" width="2" height="1" />
        <rect x="9" y="14" width="1" height="1" />
        <rect x="6" y="15" width="4" height="1" />
      </g>
    </svg>
  );
}

export function IconeCadeado({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${BASE} ${className}`}
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <rect x="5" y="1" width="6" height="2" />
      <rect x="4" y="3" width="2" height="4" />
      <rect x="10" y="3" width="2" height="4" />
      <rect x="2" y="7" width="12" height="8" />
      <rect x="7" y="9" width="2" height="4" fill="var(--color-panel)" />
    </svg>
  );
}
