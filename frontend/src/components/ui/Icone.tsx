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
