"use client";

import { useRef, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import { estaConcluida } from "@/lib/progresso";

export const MINIMO_DA_RESPOSTA = 10;

function mensagemDoErro(erro: unknown): string {
  if (!(erro instanceof ErroApi))
    return "Não foi possível enviar agora. Tente de novo.";
  if (erro.status === 401)
    return "Entre na sua conta para registrar o progresso.";
  return erro.message;
}

export function useRespostaEscrita(trilhaSlug: string, exercicioSlug: string) {
  const { chaves, recarregar } = useProgresso();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [diaGanho, setDiaGanho] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const emVoo = useRef(false);

  const jaFeito = estaConcluida(chaves, trilhaSlug, exercicioSlug);
  const respondido = referencia !== null;
  const caracteres = texto.trim().length;
  const curto = caracteres < MINIMO_DA_RESPOSTA;
  const podeEnviar = !enviando && (jaFeito || !curto);

  async function enviar() {
    if (emVoo.current || !podeEnviar) return;
    emVoo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = await api.concluirExercicio(trilhaSlug, exercicioSlug);
      if (!resultado.aprovado) {
        setAviso("Este exercício é corrigido pelo editor.");
        return;
      }
      const explicacao =
        (resultado as { explicacao?: string }).explicacao ?? "";
      setReferencia(explicacao);
      setXpGanho(resultado.ja_concluido ? null : resultado.xp_ganho);
      setDiaGanho(resultado.sequencia.aumentou);
      recarregar();
    } catch (erro) {
      setAviso(mensagemDoErro(erro));
    } finally {
      setEnviando(false);
      emVoo.current = false;
    }
  }

  return {
    texto,
    setTexto,
    enviando,
    referencia,
    xpGanho,
    diaGanho,
    aviso,
    jaFeito,
    respondido,
    caracteres,
    curto,
    podeEnviar,
    enviar,
  };
}
