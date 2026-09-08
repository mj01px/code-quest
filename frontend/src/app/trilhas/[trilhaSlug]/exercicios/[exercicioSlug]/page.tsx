import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { Badge, BadgeDificuldade } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import {
  ErroApi,
  buscarExercicio,
  buscarTrilha,
  listarTrilhas,
} from "@/lib/api";
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

  return (
    <>
      <Breadcrumb
        passos={[
          { rotulo: "Trilhas", href: "/trilhas" },
          {
            rotulo: exercicio.trilha_nome,
            href: `/trilhas/${exercicio.trilha_slug}`,
          },
          { rotulo: exercicio.titulo },
        ]}
      />

      <article className="mt-6 border border-brand bg-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <BadgeDificuldade
            dificuldade={exercicio.dificuldade}
            rotulo={exercicio.dificuldade_label}
          />
          <Badge>{exercicio.tipo_label}</Badge>
          <Badge>Módulo: {exercicio.aula_titulo}</Badge>
        </div>

        <h1 className="titulo mt-5 text-2xl text-ink-soft">
          {exercicio.titulo}
        </h1>

        <div className="mt-6 border-t border-edge pt-6">
          <h2 className="rotulo text-ink-muted">Enunciado</h2>
          <p className="mt-3 max-w-prose text-xs leading-loose whitespace-pre-wrap text-ink-soft">
            {exercicio.enunciado}
          </p>
        </div>
      </article>

      <BotaoConclusao
        trilhaSlug={exercicio.trilha_slug}
        faseSlug={exercicio.slug}
      />

      <p className="mt-6 border border-edge bg-panel p-4 text-xs leading-relaxed text-ink-muted">
        O terminal integrado para resolver e submeter este exercício chega em uma
        próxima entrega.
      </p>

      <Link
        href={`/trilhas/${exercicio.trilha_slug}`}
        className="rotulo mt-6 inline-block border border-edge-soft px-4 py-2 text-ink-muted hover:border-brand hover:text-brand"
      >
        Voltar para {exercicio.trilha_nome}
      </Link>
    </>
  );
}
