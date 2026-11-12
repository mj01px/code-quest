import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AreaDeResolucao } from "@/components/exercicio/AreaDeResolucao";
import { BlocoAprender } from "@/components/exercicio/BlocoAprender";
import { PetDoExercicio } from "@/components/exercicio/PetDoExercicio";
import { BarraDeFoco } from "@/components/layout/BarraDeFoco";
import { ErroApi, buscarExercicio } from "@/lib/api";
import { TRILHA_DOS_DESAFIOS } from "@/lib/desafios";
import { xpDaFase } from "@/lib/derivados";
import type { ExercicioDetalhe } from "@/lib/types";

export const revalidate = 60;

// Sem generateStaticParams: o layout raiz renderiza por request (nonce da CSP),
// e uma lista vazia no build fazia o slug cair no render estático e dar 500.

async function carregar(desafioSlug: string): Promise<ExercicioDetalhe> {
  try {
    return await buscarExercicio(TRILHA_DOS_DESAFIOS, desafioSlug);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.naoEncontrado) {
      notFound();
    }
    throw erro;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/desafios/[desafioSlug]">): Promise<Metadata> {
  const { desafioSlug } = await params;
  const desafio = await carregar(desafioSlug);
  return { title: `${desafio.titulo} · Desafio do dia` };
}

export default async function DesafioPage({
  params,
}: PageProps<"/desafios/[desafioSlug]">) {
  const { desafioSlug } = await params;
  const desafio = await carregar(desafioSlug);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <BarraDeFoco sairHref="/desafios" centro="Desafio do dia" />

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AreaDeResolucao
            trilhaSlug={desafio.trilha_slug}
            exercicioSlug={desafio.slug}
            tipo={desafio.tipo}
            alternativas={desafio.alternativas}
            aprender={
              <BlocoAprender
                cabecalho="Desafio do dia"
                titulo={desafio.titulo}
                contexto={desafio.contexto?.trim() ?? ""}
                enunciado={desafio.enunciado}
                xp={xpDaFase(desafio.dificuldade)}
              />
            }
            pet={
              <PetDoExercicio
                trilhaSlug={desafio.trilha_slug}
                exercicioSlug={desafio.slug}
                aulaTitulo={desafio.aula_titulo}
                dica="O desafio do dia não depende de trilha nenhuma: leia a missão, rode o código e veja o que a sua função devolve no terminal."
              />
            }
          />
        </div>
      </main>
    </div>
  );
}
