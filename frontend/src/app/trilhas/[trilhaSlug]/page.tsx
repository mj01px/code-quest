import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SeloBonusXp } from "@/components/gamificacao/SeloBonusXp";
import { AulaCard } from "@/components/trilhas/AulaCard";
import { HeroTrilha } from "@/components/trilhas/HeroTrilha";
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
  const tituloPorSlug = new Map(
    trilha.aulas.map((aula) => [aula.slug, aula.titulo]),
  );

  // O backend não tem pré-requisito de trilha inteira, só entre módulos.
  const ficha = [
    { rotulo: "Nível", valor: nivel ?? "Sem nível" },
    { rotulo: "Duração", valor: `${duracaoEmHoras(fases)} horas` },
    { rotulo: "Projetos", valor: String(totalDeProjetos(trilha)) },
    { rotulo: "Pré-requisito", valor: "Nenhum" },
  ];

  const paragrafos = trilha.descricao
    .split(/\n{2,}/)
    .map((texto) => texto.trim())
    .filter(Boolean);

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
        descricao={trilha.descricao}
        totalDeModulos={trilha.aulas.length}
        totalDeFases={fases}
        selo={<SeloBonusXp trilhaSlug={trilha.slug} />}
      />

      <dl className="mt-4 grid grid-cols-2 gap-px border border-edge bg-edge lg:grid-cols-4">
        {ficha.map((item) => (
          <div key={item.rotulo} className="bg-panel p-4">
            <dt className="rotulo text-ink-muted">{item.rotulo}</dt>
            <dd className="titulo mt-2.5 text-sm text-ink-soft">{item.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="sobre">
          <h2 id="sobre" className="titulo text-base text-ink-soft">
            Sobre a trilha
          </h2>
          {paragrafos.map((paragrafo) => (
            <p
              key={paragrafo}
              className="mt-4 text-xs leading-relaxed text-ink-muted"
            >
              {paragrafo}
            </p>
          ))}
        </section>

        {trilha.aulas.length > 0 ? (
          <section aria-labelledby="dominar">
            <h2 id="dominar" className="titulo text-base text-ink-soft">
              Você vai dominar
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {competencias(trilha).map((competencia) => (
                <li key={competencia} className="flex items-start gap-3">
                  <IconeCheck className="mt-0.5 h-3.5 w-3.5 text-brand" />
                  <span className="text-[0.6875rem] leading-relaxed text-ink-muted">
                    {competencia}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <section className="mt-10" aria-labelledby="mapa-de-fases">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="mapa-de-fases" className="titulo text-base text-ink-soft">
            Mapa de fases
          </h2>
          <p className="rotulo text-ink-muted">
            {plural(trilha.aulas.length, "módulo", "módulos")} ·{" "}
            {plural(fases, "fase", "fases")}
          </p>
        </div>

        {trilha.aulas.length === 0 ? (
          <p className="mt-4 border border-edge bg-panel p-6 text-xs text-ink-muted">
            As fases desta trilha ainda estão sendo escritas.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {trilha.aulas.map((aula, indice) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                trilhaSlug={trilha.slug}
                posicao={indice + 1}
                preRequisitoTitulo={
                  aula.pre_requisito
                    ? tituloPorSlug.get(aula.pre_requisito)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
