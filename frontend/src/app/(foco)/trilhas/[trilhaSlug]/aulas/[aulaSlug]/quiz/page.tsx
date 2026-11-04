import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuizDaAula } from "@/components/licao/QuizDaAula";
import { GuardaDeEtapa } from "@/components/trilhas/GuardaDeEtapa";
import { carregarAula, rotaDaAula, rotaDoExercicio } from "@/lib/aulas";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/aulas/[aulaSlug]/quiz">): Promise<Metadata> {
  const { trilhaSlug, aulaSlug } = await params;
  const { aula } = await carregarAula(trilhaSlug, aulaSlug);
  return { title: `Quiz · ${aula.titulo}` };
}

export default async function QuizPage({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/aulas/[aulaSlug]/quiz">) {
  const { trilhaSlug, aulaSlug } = await params;
  const { trilha, aula } = await carregarAula(trilhaSlug, aulaSlug);
  const questoes = aula.questoes ?? [];
  if (questoes.length === 0) notFound();

  const primeiraFase = aula.exercicios[0] ?? null;

  return (
    <GuardaDeEtapa trilhaSlug={trilha.slug} tipo="QUIZ" aulaSlug={aula.slug}>
      <QuizDaAula
        trilhaSlug={trilha.slug}
        aulaSlug={aula.slug}
        aulaTitulo={aula.titulo}
        questoes={questoes}
        rotaDaLicao={rotaDaAula(trilha.slug, aula.slug)}
        rotaDosExercicios={
          primeiraFase ? rotaDoExercicio(trilha.slug, primeiraFase.slug) : null
        }
      />
    </GuardaDeEtapa>
  );
}
