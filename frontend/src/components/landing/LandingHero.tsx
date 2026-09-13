import Image from "next/image";
import { CtaLink } from "./CtaLink";
import { COMPANHEIROS, sprite } from "./dados";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b-2 border-edge">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-5 py-20 text-center sm:px-8 sm:py-28">
        <h1 className="m-0 font-display text-[28px] leading-[1.5] tracking-wide text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[46px] sm:leading-[1.4]">
          Aprenda a programar{" "}
          <span className="text-brand-light">como quem joga</span>
        </h1>

        <p className="m-0 max-w-2xl font-body text-[21px] leading-[1.5] text-ink-body text-pretty">
          Encare quests de programação prontas para jogar, resolva código de
          verdade no navegador e evolua seu pet a cada desafio vencido. Tudo
          dentro de um terminal de verdade.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <CtaLink href="#cli" variante="secundaria">
            VER A CLI
          </CtaLink>
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-5">
          <ul className="flex list-none flex-wrap items-end justify-center gap-8 p-0 sm:gap-16">
            {COMPANHEIROS.map((c) => (
              <li key={c.slug} className="flex flex-col items-center gap-2">
                <Image
                  src={sprite(c.slug, 1)}
                  alt={c.alt}
                  width={500}
                  height={500}
                  className="h-20 w-20 animate-bob sm:h-24 sm:w-24"
                />
                <span className="font-label text-[9px] tracking-[0.15em] text-ink-muted">
                  {c.nome.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
          <span className="font-label text-[10px] tracking-[0.2em] text-ink-dim">
            ESCOLHA SEU COMPANHEIRO NO PRIMEIRO LOGIN
            <span
              className="ml-1 inline-block h-3 w-2 bg-brand-strong align-middle animate-blink"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </section>
  );
}
