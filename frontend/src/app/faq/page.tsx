import type { Metadata } from "next";
import Link from "next/link";

import { CentralDeFaq } from "@/components/ajuda/CentralDeFaq";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";
import { DADOS_LEGAIS } from "@/lib/dadosLegais";
import { CATEGORIAS_FAQ } from "@/lib/faq";
import { TIPO } from "@/lib/tipografia";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Respostas rápidas sobre conta, criaturas, trilhas, exercícios, XP, ranking, clãs e autoria na CodeQuest.",
};

interface Props {
  searchParams?: Promise<{ categoria?: string | string[]; q?: string | string[] }>;
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaFaq({ searchParams }: Props) {
  const params = (await searchParams) ?? {};

  return (
    <TelaBase>
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-8 flex flex-col gap-5 border-b-2 border-edge pb-8">
          <span className={`${TIPO.sobretitulo} text-brand-light`}>
            {"// AJUDA"}
          </span>
          <h1
            className={`m-0 ${TIPO.tituloPagina} text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[22px]`}
          >
            FAQ<span className="text-brand">.</span>CODEQUEST
          </h1>
          <p className={`m-0 max-w-[62ch] ${TIPO.corpo} text-ink-body text-pretty`}>
            Travou em alguma coisa? Busca aí ou escolhe uma categoria. Se não
            achar, chama a gente.
          </p>
        </header>

        <CentralDeFaq
          categorias={CATEGORIAS_FAQ}
          categoriaInicial={primeiro(params.categoria)}
          buscaInicial={primeiro(params.q)}
        />

        <aside className="mt-12 flex flex-col gap-3 border-2 border-edge bg-panel p-6 shadow-pixel sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex flex-col gap-2">
            <h2 className={`m-0 ${TIPO.tituloSecao} text-ink`}>
              Não achou sua resposta?
            </h2>
            <p className={`m-0 ${TIPO.corpo} text-ink-body`}>
              Escreve pra{" "}
              <a href={`mailto:${DADOS_LEGAIS.emailContato}`}>
                {DADOS_LEGAIS.emailContato}
              </a>{" "}
              contando o que tentou fazer, o que aconteceu e o seu nickname.
            </p>
          </div>
          <Link
            href="/suporte"
            className="rotulo inline-flex min-h-11 shrink-0 items-center justify-center border-2 border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30"
          >
            IR PARA O SUPORTE
          </Link>
        </aside>
      </main>
    </TelaBase>
  );
}
