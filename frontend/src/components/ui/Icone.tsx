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
