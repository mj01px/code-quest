import type { Conquista } from "./dados";
import { CONQUISTAS } from "./dados";
import { TituloSecao } from "./TituloSecao";

function IconeConquista({ tipo }: { tipo: Conquista["icone"] }) {
  const base = "h-10 w-10 text-brand";
  if (tipo === "monitor") {
    return (
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={base}
      >
        <rect x="2" y="2" width="12" height="9" />
        <path d="M6 14h4M8 11v3" />
      </svg>
    );
  }
  if (tipo === "chama") {
    return (
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="currentColor"
        className={base}
      >
        <rect x="7" y="1" width="2" height="3" />
        <rect x="6" y="3" width="4" height="2" />
        <rect x="5" y="5" width="6" height="2" />
        <rect x="4" y="7" width="8" height="5" />
        <rect x="3" y="9" width="10" height="4" />
        <rect x="6" y="10" width="4" height="3" fill="#0a0a0f" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={base}
    >
      <rect x="2" y="2" width="12" height="12" />
      <path d="M5 6l2 2-2 2M9 10h3" />
    </svg>
  );
}

export function Conquistas() {
  return (
    <section id="conquistas" className="border-b-2 border-edge bg-panel-deep/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 py-20 sm:px-8">
        <TituloSecao rotulo="CONQUISTAS" titulo="Prove que passou de fase" />

        <ul className="grid list-none gap-6 p-0 lg:grid-cols-3">
          {CONQUISTAS.map((conquista) => (
            <li
              key={conquista.titulo}
              className="flex flex-col items-center gap-4 border-2 border-edge bg-panel p-8 text-center shadow-pixel transition-none hover:border-brand-strong hover:-translate-y-1"
            >
              <IconeConquista tipo={conquista.icone} />
              <h3 className="m-0 font-display text-[12px] leading-[1.6] tracking-wide text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
                {conquista.titulo}
              </h3>
              <p className="m-0 font-body text-[18px] leading-[1.4] text-ink-muted text-pretty">
                {conquista.texto}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
