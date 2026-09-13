import Image from "next/image";
import { CtaLink } from "./CtaLink";

export function ChamadaFinal() {
  return (
    <section className="border-b-2 border-edge">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-5 py-24 text-center sm:px-8">
        <Image
          src="/marca/ovo.png"
          alt=""
          width={1254}
          height={1254}
          className="h-16 w-16 animate-bob"
        />
        <h2 className="m-0 font-display text-[24px] leading-[1.5] tracking-wide text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[32px]">
          Insira uma ficha{" "}
          <span className="text-brand-light">e comece a jogar</span>
        </h2>
        <p className="m-0 max-w-xl font-body text-[21px] leading-[1.5] text-ink-body text-pretty">
          Conta gratuita, sem cartão. Escolha seu pet e a primeira fase já sai do
          seu próprio material.
        </p>
        <CtaLink href="/cadastro" variante="primaria">
          CRIAR CONTA GRÁTIS
        </CtaLink>
      </div>
    </section>
  );
}
