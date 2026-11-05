import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AreaDeResolucao } from "@/components/exercicio/AreaDeResolucao";
import { BlocoAprender } from "@/components/exercicio/BlocoAprender";
import { PetDoExercicio } from "@/components/exercicio/PetDoExercicio";
import { TelaTeorica } from "@/components/exercicio/TelaTeorica";
import {
  AcoesDoExercicio,
  PlacarDoModulo,
} from "@/components/exercicio/NavegacaoDoExercicio";
import { BarraDeFoco } from "@/components/layout/BarraDeFoco";
import { GuardaDeEtapa } from "@/components/trilhas/GuardaDeEtapa";
import {
  ErroApi,
  buscarExercicio,
  buscarTrilha,
  listarTrilhas,
} from "@/lib/api";
import { numeroDoModulo, rotaDaAula, rotaDoExercicio } from "@/lib/aulas";
import { fasesEmOrdem, xpDaFase } from "@/lib/derivados";
import type { ExercicioDetalhe } from "@/lib/types";

// Pares (trilha, exercício) fixados no build, como na página da trilha.
export const dynamicParams = false;
export const revalidate = 60;

export async function generateStaticParams() {
  const trilhas = await listarTrilhas();
  const detalhes = await Promise.all(
    trilhas.map((trilha) => buscarTrilha(trilha.slug)),
  );

  // Rede de segurança: o backend já garante slug único por trilha.
  const vistos = new Set<string>();
  const caminhos: { trilhaSlug: string; exercicioSlug: string }[] = [];

  for (const trilha of detalhes) {
    for (const aula of trilha.aulas) {
      for (const exercicio of aula.exercicios) {
        const caminho = `${trilha.slug}/${exercicio.slug}`;
        if (vistos.has(caminho)) continue;
        vistos.add(caminho);
        caminhos.push({
          trilhaSlug: trilha.slug,
          exercicioSlug: exercicio.slug,
        });
      }
    }
  }

  return caminhos;
}

async function carregar(
  trilhaSlug: string,
  exercicioSlug: string,
): Promise<ExercicioDetalhe> {
  try {
    return await buscarExercicio(trilhaSlug, exercicioSlug);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.naoEncontrado) {
      notFound();
    }
    throw erro;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]">): Promise<Metadata> {
  const { trilhaSlug, exercicioSlug } = await params;
  // O notFound() precisa sair daqui: no render a resposta já saiu como 200.
  const exercicio = await carregar(trilhaSlug, exercicioSlug);
  return { title: `${exercicio.titulo} · ${exercicio.trilha_nome}` };
}

export default async function ExercicioPage({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]">) {
  const { trilhaSlug, exercicioSlug } = await params;
  const exercicio = await carregar(trilhaSlug, exercicioSlug);
  const trilha = await buscarTrilha(exercicio.trilha_slug);

  const fases = fasesEmOrdem(trilha);
  const indice = fases.findIndex((fase) => fase.slug === exercicio.slug);
  const atual = fases[indice];
  const proximo = indice >= 0 ? (fases[indice + 1] ?? null) : null;
  const posicaoDoModulo =
    atual?.moduloPosicao ??
    Math.max(
      1,
      trilha.aulas.findIndex((aula) => aula.slug === exercicio.aula_slug) + 1,
    );
  const fasesDoModulo = fases
    .filter((fase) => fase.moduloPosicao === posicaoDoModulo)
    .map((fase) => fase.slug);

  const proximoHref = proximo
    ? rotaDoExercicio(exercicio.trilha_slug, proximo.slug)
    : `/trilhas/${exercicio.trilha_slug}/concluida`;

  const contexto = exercicio.contexto?.trim() ?? "";

  const aprender = (
    <BlocoAprender
      cabecalho={`${exercicio.trilha_nome} · Módulo ${numeroDoModulo(posicaoDoModulo)}`}
      titulo={exercicio.titulo}
      contexto={contexto}
      enunciado={exercicio.enunciado}
      xp={xpDaFase(exercicio.dificuldade)}
    />
  );

  return (
    <GuardaDeEtapa
      trilhaSlug={exercicio.trilha_slug}
      tipo="EXERCICIO"
      aulaSlug={exercicio.aula_slug}
      exercicioSlug={exercicio.slug}
    >
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <BarraDeFoco
          sairHref={`/trilhas/${exercicio.trilha_slug}`}
          centro={`Módulo: ${exercicio.aula_titulo}`}
          placar={
            <PlacarDoModulo
              trilhaSlug={exercicio.trilha_slug}
              fases={fasesDoModulo}
            />
          }
        />

        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {exercicio.tipo === "TEORICO" ? (
              <TelaTeorica
                trilhaSlug={exercicio.trilha_slug}
                exercicioSlug={exercicio.slug}
                cabecalho={`${exercicio.trilha_nome} · Módulo ${numeroDoModulo(posicaoDoModulo)}`}
                titulo={exercicio.titulo}
                enunciado={exercicio.enunciado}
                xp={xpDaFase(exercicio.dificuldade)}
                contexto={contexto}
                exemplo={exercicio.exemplo?.trim() ?? ""}
                licaoHref={rotaDaAula(exercicio.trilha_slug, exercicio.aula_slug)}
                pet={
                  <PetDoExercicio
                    trilhaSlug={exercicio.trilha_slug}
                    exercicioSlug={exercicio.slug}
                    aulaTitulo={exercicio.aula_titulo}
                    dica={`Aqui não tem resposta certa decorada: explique com as suas palavras. Se travar, a lição "${exercicio.aula_titulo}" tem o que você precisa.`}
                  />
                }
              />
            ) : (
              <AreaDeResolucao
                trilhaSlug={exercicio.trilha_slug}
                exercicioSlug={exercicio.slug}
                tipo={exercicio.tipo}
                alternativas={exercicio.alternativas}
                aprender={aprender}
                pet={
                  <PetDoExercicio
                    trilhaSlug={exercicio.trilha_slug}
                    exercicioSlug={exercicio.slug}
                    aulaTitulo={exercicio.aula_titulo}
                  />
                }
              />
            )}

            <AcoesDoExercicio
              trilhaSlug={exercicio.trilha_slug}
              exercicioSlug={exercicio.slug}
              proximoHref={proximoHref}
            />
          </div>
        </main>
      </div>
    </GuardaDeEtapa>
  );
}
