"use client";

// O progresso do aluno mora no servidor, não no navegador.
//
// A versão anterior deste módulo guardava as fases concluídas em
// `localStorage`, porque não havia autenticação e não existia a quem associar o
// progresso. Agora existe: `/eu/exercicios-concluidos/` é a autoridade, e o
// progresso segue a conta em vez de seguir o navegador.
//
// Nada aqui lê ou grava `localStorage`. É intencional e há teste que afirma
// isso — chave residual de instalação antiga fica inerte, sem ninguém que a
// leia. As funções puras ficam separadas do hook de propósito: dá para testar
// a agregação sem montar componente.

import { useEffect, useState } from "react";

import { api, temSessao } from "@/lib/api";
import type { ExercicioConcluido } from "@/lib/types";

const VAZIO: readonly ExercicioConcluido[] = Object.freeze([]);
const SEM_CHAVES: ReadonlySet<string> = Object.freeze(new Set<string>());

/** O slug do exercício só é único dentro da trilha; a chave junta os dois. */
export function chaveDaFase(trilhaSlug: string, faseSlug: string): string {
  return `${trilhaSlug}/${faseSlug}`;
}

/**
 * A API é fronteira, não fonte confiável de tipo: linha sem os dois slugs não
 * vira marca nenhuma na tela, então é descartada aqui em vez de virar
 * `undefined/undefined` numa chave.
 */
export function normalizar(bruto: unknown): readonly ExercicioConcluido[] {
  if (!Array.isArray(bruto)) return VAZIO;

  const limpo: ExercicioConcluido[] = [];
  for (const linha of bruto) {
    if (typeof linha !== "object" || linha === null) continue;
    const { trilha_slug, exercicio_slug, xp, criado_em } =
      linha as Partial<ExercicioConcluido>;
    if (typeof trilha_slug !== "string" || trilha_slug === "") continue;
    if (typeof exercicio_slug !== "string" || exercicio_slug === "") continue;
    limpo.push({
      trilha_slug,
      exercicio_slug,
      xp: typeof xp === "number" ? xp : 0,
      criado_em: typeof criado_em === "string" ? criado_em : "",
    });
  }

  return Object.freeze(limpo);
}

export function chavesConcluidas(
  concluidos: readonly ExercicioConcluido[],
): ReadonlySet<string> {
  return new Set(
    concluidos.map((item) =>
      chaveDaFase(item.trilha_slug, item.exercicio_slug),
    ),
  );
}

export function estaConcluida(
  chaves: ReadonlySet<string>,
  trilhaSlug: string,
  faseSlug: string,
): boolean {
  return chaves.has(chaveDaFase(trilhaSlug, faseSlug));
}

/** Quantas fases o aluno concluiu em cada trilha. */
export function contarPorTrilha(
  concluidos: readonly ExercicioConcluido[],
): ReadonlyMap<string, number> {
  const contagem = new Map<string, number>();
  for (const item of concluidos) {
    contagem.set(item.trilha_slug, (contagem.get(item.trilha_slug) ?? 0) + 1);
  }
  return contagem;
}

/** Slugs concluídos de uma trilha, na ordem em que a API devolveu. */
export function concluidasDaTrilha(
  concluidos: readonly ExercicioConcluido[],
  trilhaSlug: string,
): readonly string[] {
  return concluidos
    .filter((item) => item.trilha_slug === trilhaSlug)
    .map((item) => item.exercicio_slug);
}

/**
 * Percentual de 0 a 100. Fica limitado a 100 de propósito: uma fase
 * despublicada continua contando como concluída para quem já a fez, e sem o
 * teto a barra passaria do fim.
 */
export function percentual(feitas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (feitas / total) * 100);
}

export interface Conclusoes {
  concluidos: readonly ExercicioConcluido[];
  chaves: ReadonlySet<string>;
  /** Verdadeiro até a resposta chegar. Quem desenha número espera por ele. */
  carregando: boolean;
}

const NEUTRO: Conclusoes = Object.freeze({
  concluidos: VAZIO,
  chaves: SEM_CHAVES,
  carregando: true,
});

const PRONTO_VAZIO: Conclusoes = Object.freeze({
  concluidos: VAZIO,
  chaves: SEM_CHAVES,
  carregando: false,
});

/**
 * As conclusões do aluno logado. Sem sessão devolve lista vazia sem ir à rede.
 *
 * O estado inicial é o mesmo que o servidor renderiza, então a hidratação não
 * diverge: o pedido só sai depois de montado.
 */
export function useConclusoes(trilhaSlug?: string): Conclusoes {
  const [estado, setEstado] = useState<Conclusoes>(NEUTRO);

  useEffect(() => {
    let ativo = true;

    // Sem sessão não há o que buscar, mas a resposta ainda assim passa pela
    // promessa: `setState` no corpo do efeito dispara render em cascata.
    const pedido = temSessao()
      ? api.exerciciosConcluidos(trilhaSlug)
      : Promise.resolve<ExercicioConcluido[]>([]);

    pedido
      .then((resposta) => {
        if (!ativo) return;
        const concluidos = normalizar(resposta);
        setEstado({
          concluidos,
          chaves: chavesConcluidas(concluidos),
          carregando: false,
        });
      })
      .catch(() => {
        // Falhar aqui não pode apagar a tela: cai no estado neutro, que é o
        // mesmo de quem ainda não concluiu nada.
        if (ativo) setEstado(PRONTO_VAZIO);
      });

    // Sem reset do estado ao trocar de trilha: a trava `ativo` já descarta a
    // resposta velha, e zerar aqui piscaria a tela entre uma trilha e outra.
    return () => {
      ativo = false;
    };
  }, [trilhaSlug]);

  return estado;
}
