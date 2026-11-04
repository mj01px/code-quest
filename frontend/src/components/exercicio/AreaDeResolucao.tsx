"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { GradeDoExercicio } from "@/components/exercicio/GradeDoExercicio";

import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { PainelDeAlternativas } from "@/components/exercicio/PainelDeAlternativas";
import { PainelFlashcard } from "@/components/exercicio/PainelFlashcard";
import { PainelDeResposta } from "@/components/exercicio/PainelDeResposta";
import { ErroApi, api } from "@/lib/api";
import type {
  AlternativaExercicio,
  EspecificacaoDeCodigo,
  TipoExercicio,
} from "@/lib/types";

function notaDaFalha(status: number | null): string {
  if (status === 403) {
    return "Seu nível de acesso não inclui resolver exercícios com código. Fale com um administrador.";
  }
  return "Não foi possível carregar o editor agora. Recarregue a página.";
}

export function AreaDeResolucao({
  trilhaSlug,
  exercicioSlug,
  tipo,
  alternativas = [],
  aprender,
  pet,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  tipo?: TipoExercicio;
  alternativas?: AlternativaExercicio[];
  aprender?: ReactNode;
  pet?: ReactNode;
}) {
  const [especificacao, setEspecificacao] =
    useState<EspecificacaoDeCodigo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<number | null>(null);

  useEffect(() => {
    if (tipo && tipo !== "CODIGO") return;
    let vivo = true;

    api
      .especificacaoDeCodigo(trilhaSlug, exercicioSlug)
      .then((dados) => {
        if (vivo) setEspecificacao(dados);
      })
      .catch((erro: unknown) => {
        if (!vivo) return;
        setEspecificacao(null);
        setFalha(erro instanceof ErroApi ? erro.status : null);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [trilhaSlug, exercicioSlug, tipo]);

  function resolver(): ReactNode {
    if (tipo === "ALTERNATIVA") {
      return (
        <PainelDeAlternativas
          trilhaSlug={trilhaSlug}
          exercicioSlug={exercicioSlug}
          alternativas={alternativas}
        />
      );
    }
    if (tipo === "FLASHCARD") {
      return <PainelFlashcard trilhaSlug={trilhaSlug} exercicioSlug={exercicioSlug} />;
    }
    if (tipo === "TEORICO") {
      return <PainelDeResposta trilhaSlug={trilhaSlug} exercicioSlug={exercicioSlug} />;
    }
    if (carregando) {
      return <p className="mt-6 font-label text-xs text-ink-muted">carregando...</p>;
    }
    if (falha === 401) {
      return (
        <div className="mt-6 flex flex-col items-start gap-4 border-2 border-brand-shadow bg-panel-deep p-5">
          <p className="m-0 font-body text-lg leading-[1.6] text-ink-body">
            Sua sessão expirou. Entre de novo para resolver este exercício.
          </p>
          <Link
            href={`/entrar?destino=${encodeURIComponent(`/trilhas/${trilhaSlug}/exercicios/${exercicioSlug}`)}`}
            className="border-[3px] border-brand-light bg-brand-deep px-6 py-3.5 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink uppercase hover:bg-brand-strong"
          >
            Entrar
          </Link>
        </div>
      );
    }
    if (falha === 404) {
      return (
        <PainelDeResposta
          trilhaSlug={trilhaSlug}
          exercicioSlug={exercicioSlug}
          placeholder="Escreva aqui o seu código."
          nota="A correção automática deste exercício ainda não existe. Escreva a sua solução, envie e compare com a resposta de referência."
        />
      );
    }
    return (
      <p className="mt-6 border border-edge bg-panel p-4 text-xs leading-relaxed text-ink-muted">
        {notaDaFalha(falha)}
      </p>
    );
  }

  if (especificacao && tipo !== "ALTERNATIVA" && tipo !== "FLASHCARD" && tipo !== "TEORICO") {
    return (
      <PainelDeCodigo
        trilhaSlug={trilhaSlug}
        exercicioSlug={exercicioSlug}
        especificacao={especificacao}
        aprender={aprender}
        pet={pet}
      />
    );
  }

  if (aprender === undefined) return resolver();

  return (
    <GradeDoExercicio
      pet={pet}
      aprender={aprender}
      centro={
        <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-5 py-8 sm:px-10">
          <div className="w-full max-w-2xl">{resolver()}</div>
        </div>
      }
    />
  );
}
