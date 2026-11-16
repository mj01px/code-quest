// Só no servidor: lê cookies da requisição (next/headers não vai ao navegador).
// O catálogo exige login desde 2026-11-16. As páginas de trilha, exercício e
// desafio buscam os dados com o cookie de acesso do próprio aluno; sem ele, ou
// com ele vencido, o servidor manda para /sessao, que renova no navegador (o
// cookie de renovação só viaja para /api/v1/auth/) e devolve o aluno à página.

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  ErroApi,
  buscarDesafioDeHoje,
  buscarExercicio,
  buscarTrilha,
  listarTrilhas,
} from "@/lib/api";
import type {
  DesafioDeHoje,
  ExercicioDetalhe,
  TrilhaDetalhe,
  TrilhaResumo,
} from "@/lib/types";

const COOKIE_DE_ACESSO = "cq_access";

/** Só o cookie de acesso segue para o Django: nada além do necessário. */
async function cookieDeAcesso(): Promise<string> {
  const valor = (await cookies()).get(COOKIE_DE_ACESSO)?.value;
  return valor ? `${COOKIE_DE_ACESSO}=${valor}` : "";
}

async function retomarSessao(): Promise<never> {
  // `x-caminho` vem do proxy.ts; a tela /sessao só aceita caminho interno.
  const volta = (await headers()).get("x-caminho") ?? "/trilhas";
  redirect(`/sessao?volta=${encodeURIComponent(volta)}`);
}

async function comSessao<T>(buscar: (sessao: string) => Promise<T>): Promise<T> {
  const sessao = await cookieDeAcesso();
  if (!sessao) return retomarSessao();
  let recusado = false;
  try {
    return await buscar(sessao);
  } catch (erro) {
    if (!(erro instanceof ErroApi && erro.status === 401)) throw erro;
    recusado = true;
  }
  // Fora do catch: o redirect do Next é uma exceção e não pode ser engolido.
  if (recusado) return retomarSessao();
  throw new Error("inalcançável");
}

export function listarTrilhasDoAluno(): Promise<TrilhaResumo[]> {
  return comSessao((sessao) => listarTrilhas(sessao));
}

export function buscarTrilhaDoAluno(slug: string): Promise<TrilhaDetalhe> {
  return comSessao((sessao) => buscarTrilha(slug, sessao));
}

export function buscarExercicioDoAluno(
  trilhaSlug: string,
  exercicioSlug: string,
): Promise<ExercicioDetalhe> {
  return comSessao((sessao) => buscarExercicio(trilhaSlug, exercicioSlug, sessao));
}

export function buscarDesafioDeHojeDoAluno(): Promise<DesafioDeHoje> {
  return comSessao((sessao) => buscarDesafioDeHoje(sessao));
}
