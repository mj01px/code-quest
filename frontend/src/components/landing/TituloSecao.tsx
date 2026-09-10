import type { ReactNode } from "react";

interface Props {
  readonly rotulo: string;
  readonly titulo: ReactNode;
  readonly children?: ReactNode;
  readonly centralizado?: boolean;
}

export function TituloSecao({
  rotulo,
  titulo,
  children,
  centralizado = true,
}: Props) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        centralizado ? "items-center text-center" : "items-start text-left"
      }`}
    >
      <span className="font-label text-[11px] tracking-[0.2em] text-brand-light">
        {`// ${rotulo}`}
      </span>
      <h2 className="m-0 font-display text-[19px] leading-[1.6] tracking-wide text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[26px]">
        {titulo}
      </h2>
      {children && (
        <p
          className={`m-0 max-w-2xl font-body text-[19px] leading-[1.5] text-ink-body text-pretty ${
            centralizado ? "" : "max-w-xl"
          }`}
        >
          {children}
        </p>
      )}
    </div>
  );
}
