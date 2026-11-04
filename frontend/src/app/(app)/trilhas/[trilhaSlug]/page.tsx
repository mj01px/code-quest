import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SeloBonusXp } from "@/components/gamificacao/SeloBonusXp";
import { HeroTrilha } from "@/components/trilhas/HeroTrilha";
import { MapaDeFases } from "@/components/trilhas/MapaDeFases";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { IconeCheck } from "@/components/ui/Icone";
import { ErroApi, buscarTrilha, listarTrilhas } from "@/lib/api";
import {
  competencias,
  duracaoEmHoras,
  nivelDaTrilha,
  plural,
  totalDeFases,
  totalDeProjetos,
} from "@/lib/derivados";
import type { TrilhaDetalhe } from "@/lib/types";

// Slugs fixados no build: só o roteador devolve 404 com status real.
export const dynamicParams = false;
export const revalidate = 60;

const INCLUI = [
  "Exercícios referentes à trilha escolhida",
  "Terminal integrado com feedback na hora",
  "Projetos práticos a cada módulo",
  "XP e evolução do seu pet",
];

export async function generateStaticParams() {
  const trilhas = await listarTrilhas();
  return trilhas.map((trilha) => ({ trilhaSlug: trilha.slug }));
}

async function carregar(slug: string): Promise<TrilhaDetalhe> {
  try {
    return await buscarTrilha(slug);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.naoEncontrado) {
      notFound();
    }
    throw erro;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trilhaSlug]">): Promise<Metadata> {
  const { trilhaSlug } = await params;
  // O notFound() precisa sair daqui: no render a resposta já saiu como 200.
  const trilha = await carregar(trilhaSlug);
  return { title: trilha.nome, description: trilha.descricao };
}

export default async function TrilhaPage({
  params,
}: PageProps<"/trilhas/[trilhaSlug]">) {
  const { trilhaSlug } = await params;
  const trilha = await carregar(trilhaSlug);

  const fases = totalDeFases(trilha);
  const nivel = nivelDaTrilha(trilha);

  // O backend não tem pré-requisito de trilha inteira, só entre módulos.
  const ficha = [
    { rotulo: "Nível", valor: nivel ?? "Sem nível" },
    { rotulo: "Duração", valor: `${duracaoEmHoras(fases)} horas` },
    { rotulo: "Projetos", valor: String(totalDeProjetos(trilha)) },
    { rotulo: "Pré-requisito", valor: "Nenhum" },
  ];

  const primeiraFase =
    trilha.aulas.flatMap((aula) => aula.exercicios)[0] ?? null;
  const primeiraAula =
    trilha.aulas.find((aula) => aula.conteudo.trim() !== "") ?? null;
  const totalDeFlashcards = trilha.aulas.reduce(
    (soma, aula) => soma + (aula.flashcards ?? []).length,
    0,
  );

  // Três textos, três lugares. Cada um cai no anterior quando está vazio,
  // que é o caso das trilhas ainda sem conteúdo escrito.
  const resumo = trilha.resumo.trim() || trilha.descricao;
  const paragrafos = (trilha.sobre.trim() || resumo)
    .split(/\n{2,}/)
    .map((texto) => texto.trim())
    .filter(Boolean);
  const metade = Math.ceil(paragrafos.length / 2);
  const colunasDoSobre = [
    paragrafos.slice(0, metade),
    paragrafos.slice(metade),
  ].filter((coluna) => coluna.length > 0);

  return (
    <>
      <Breadcrumb
        passos={[
          { rotulo: "Trilhas", href: "/trilhas" },
          { rotulo: trilha.nome },
        ]}
      />

      <HeroTrilha
        nome={trilha.nome}
        slug={trilha.slug}
        descricao={resumo}
        totalDeFases={fases}
        primeiraFaseSlug={primeiraFase?.slug ?? null}
        primeiraAulaSlug={primeiraAula?.slug ?? null}
        criadoPor={trilha.criado_por}
        selo={<SeloBonusXp trilhaSlug={trilha.slug} />}
      />

      <dl className="mt-6 grid grid-cols-2 gap-px border-2 border-edge bg-edge lg:grid-cols-4">
        {ficha.map((item) => (
          <div key={item.rotulo} className="flex flex-col gap-2 bg-panel p-5">
            <dt className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
              {item.rotulo}
            </dt>
            <dd className="m-0 font-display text-[12px] leading-[1.6] text-ink">
              {item.valor}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="sobre" className="mt-12 flex flex-col gap-4">
        <h2
          id="sobre"
          className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink"
        >
          Sobre a trilha
        </h2>
        <div
          className={`grid gap-x-10 gap-y-4 ${colunasDoSobre.length > 1 ? "lg:grid-cols-2" : ""}`}
        >
          {colunasDoSobre.map((coluna) => (
            <div key={coluna.join()} className="flex flex-col gap-4">
              {coluna.map((paragrafo) => (
                <p
                  key={paragrafo}
                  className="m-0 font-body text-lg leading-[1.7] tracking-[1px] text-ink-body text-pretty"
                >
                  {paragrafo}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {trilha.aulas.length > 0 ? (
        <section aria-labelledby="dominar" className="mt-12 flex flex-col gap-4">
          <h2
            id="dominar"
            className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink"
          >
            Você vai dominar
          </h2>
          <ul className="m-0 grid list-none gap-x-10 gap-y-3 p-0 lg:grid-cols-2">
            {competencias(trilha).map((competencia) => (
              <li key={competencia} className="flex items-start gap-3">
                <IconeCheck className="mt-1.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-body">
                  {competencia}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="inclui" className="mt-12 flex flex-col gap-4">
        <h2
          id="inclui"
          className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink"
        >
          Esta trilha inclui
        </h2>
        <ul className="m-0 grid list-none gap-x-10 gap-y-3 p-0 lg:grid-cols-2">
          {INCLUI.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 bg-brand" />
              <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-body">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="mapa-de-fases">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id="mapa-de-fases"
            className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink"
          >
            Mapa de fases
          </h2>
          <div className="flex flex-wrap items-center gap-5">
            <p className="m-0 font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
              {plural(trilha.aulas.length, "módulo", "módulos")} ·{" "}
              {plural(fases, "fase", "fases")}
            </p>
            {totalDeFlashcards > 0 ? (
              <Link
                href={`/trilhas/${trilha.slug}/flashcards`}
                className="flex items-center gap-2.5 border-2 border-brand bg-transparent px-4 py-2.5 font-label text-[11px] tracking-[2px] text-brand-light uppercase shadow-pixel transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-brand-pale hover:text-ink hover:shadow-pixel-sm"
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 bg-brand" />
                Flashcards
              </Link>
            ) : null}
          </div>
        </div>

        {trilha.aulas.length === 0 ? (
          <p className="mt-6 m-0 border-2 border-dashed border-edge-soft bg-panel p-6 font-body text-xl tracking-[1px] text-ink-muted">
            &gt; As fases desta trilha ainda estão sendo escritas.
          </p>
        ) : (
          // Ilha de cliente: a página segue estática, e só a marca de fase
          // concluída, que é da conta do aluno, é buscada no navegador.
          <MapaDeFases trilha={trilha} />
        )}
      </section>
    </>
  );
}
