import type { Metadata } from "next";

import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";
import { LeituraDaLicao } from "@/components/licao/LeituraDaLicao";
import { GuardaDeEtapa } from "@/components/trilhas/GuardaDeEtapa";
import { MarcaDeLeitura } from "@/components/licao/MarcaDeLeitura";
import { ProximoPassoDaLeitura } from "@/components/licao/ProximoPassoDaLeitura";
import { numeroDoModulo, rotaDaAula } from "@/lib/aulas";
import { carregarAula } from "@/lib/aulasNoServidor";
import { plural } from "@/lib/derivados";
import { minutosDeLeitura, secoesDaLicao } from "@/lib/licao";

// O catálogo exige login: renderiza por request, com a sessão do aluno.

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/aulas/[aulaSlug]">): Promise<Metadata> {
  const { trilhaSlug, aulaSlug } = await params;
  const { trilha, aula } = await carregarAula(trilhaSlug, aulaSlug);
  return { title: `${aula.titulo} · ${trilha.nome}` };
}

export default async function LicaoPage({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/aulas/[aulaSlug]">) {
  const { trilhaSlug, aulaSlug } = await params;
  const { trilha, aula, posicao, proxima } = await carregarAula(
    trilhaSlug,
    aulaSlug,
  );

  const questoes = aula.questoes ?? [];
  const rotaQuiz = `${rotaDaAula(trilha.slug, aula.slug)}/quiz`;

  const depois = [
    questoes.length > 0
      ? `${plural(questoes.length, "pergunta", "perguntas")} de quiz`
      : null,
    aula.exercicios.length > 0
      ? plural(aula.exercicios.length, "exercício", "exercícios")
      : null,
  ].filter((item): item is string => item !== null);

  return (
    <GuardaDeEtapa trilhaSlug={trilha.slug} tipo="LEITURA" aulaSlug={aula.slug}>
      <LeituraDaLicao
        secoes={secoesDaLicao(aula.conteudo)}
        sobretitulo={`${trilha.nome} · Módulo ${numeroDoModulo(posicao)}`}
        titulo={aula.titulo}
        minutos={minutosDeLeitura(aula.conteudo)}
        rotaDeSaida={`/trilhas/${trilha.slug}`}
        depoisDaLeitura={depois.length > 0 ? `${depois.join(" e ")}.` : null}
      >
        {aula.conteudo.trim() ? (
          <ConteudoDaLicao markdown={aula.conteudo} />
        ) : (
          <p className="m-0 border-2 border-dashed border-edge-soft bg-panel p-6 font-body text-lg tracking-[1px] text-ink-muted">
            &gt; O texto desta lição ainda está sendo escrito.
          </p>
        )}

        {aula.conteudo.trim() ? (
          <MarcaDeLeitura trilhaSlug={trilha.slug} aulaSlug={aula.slug} />
        ) : null}

        <ProximoPassoDaLeitura
          trilhaSlug={trilha.slug}
          fases={aula.exercicios.map((exercicio) => exercicio.slug)}
          rotaQuiz={questoes.length > 0 ? rotaQuiz : null}
          rotaProximoModulo={proxima ? rotaDaAula(trilha.slug, proxima.slug) : null}
          rotaTrilha={`/trilhas/${trilha.slug}`}
        />
      </LeituraDaLicao>
    </GuardaDeEtapa>
  );
}
