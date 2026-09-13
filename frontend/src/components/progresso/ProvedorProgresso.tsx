"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, temSessao } from "@/lib/api";
import { chavesConcluidas, normalizar } from "@/lib/progresso";
import type {
  ExercicioConcluido,
  MinhaCriatura,
  ProgressoAtual,
  Usuario,
} from "@/lib/types";

// Context único do aluno: usuário, criatura, XP e conclusões.
// Vive no layout (app) pra não desmontar entre rotas.
// Tudo invalida junto no recarregar(), conclusões vêm sem filtro de trilha, a agregação é local.

const VAZIO: readonly ExercicioConcluido[] = Object.freeze([]);
const SEM_CHAVES: ReadonlySet<string> = Object.freeze(new Set<string>());
const SEM_TRILHAS: ReadonlySet<string> = Object.freeze(new Set<string>());

export interface ValorProgresso {
  usuario: Usuario | null;
  /** A criatura ativa; sem ela o sprite cai no avatar neutro. */
  criatura: MinhaCriatura | null;
  progresso: ProgressoAtual | null;
  concluidos: readonly ExercicioConcluido[];
  chaves: ReadonlySet<string>;
  /** Slugs das trilhas que o aluno iniciou, mesmo sem fase concluída. */
  trilhasIniciadas: ReadonlySet<string>;
  /** Verdadeiro até a primeira resposta chegar. Quem desenha número espera. */
  carregando: boolean;
  /** Relê tudo. Chamado após o POST de conclusão. */
  recarregar: () => void;
}

const ProgressoContext = createContext<ValorProgresso | null>(null);

interface Dados {
  usuario: Usuario | null;
  criatura: MinhaCriatura | null;
  progresso: ProgressoAtual | null;
  concluidos: readonly ExercicioConcluido[];
  trilhasIniciadas: ReadonlySet<string>;
}

const SEM_DADOS: Dados = Object.freeze({
  usuario: null,
  criatura: null,
  progresso: null,
  concluidos: VAZIO,
  trilhasIniciadas: SEM_TRILHAS,
});

export function ProvedorProgresso({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(SEM_DADOS);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0); // gatilho do recarregar()

  const recarregar = useCallback(() => {
    setVersao((n) => n + 1);
  }, []);

  useEffect(() => {
    let ativo = true;

    // Sem sessão, resolve direto pra null.
    const pedido = temSessao()
      ? Promise.all([
          api.eu(),
          api.minhasCriaturas(),
          api.meuProgresso(),
          api.exerciciosConcluidos(),
          api.trilhasIniciadas(),
        ])
      : Promise.resolve(null);

    pedido
      .then((resposta) => {
        if (!ativo) return;
        if (resposta === null) {
          setDados(SEM_DADOS);
          return;
        }
        const [usuario, criaturas, progresso, concluidos, iniciadas] = resposta;
        setDados({
          usuario,
          criatura: criaturas.find((c) => c.ativa) ?? criaturas[0] ?? null,
          progresso,
          concluidos: normalizar(concluidos),
          trilhasIniciadas: new Set(iniciadas),
        });
      })
      .catch(() => {
        // Erro cai no estado neutro pra não derrubar a tela.
        if (ativo) setDados(SEM_DADOS);
      })
      .finally(() => {
        // Garante que o loading sai mesmo com erro.
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [versao]);

  const valor = useMemo<ValorProgresso>(
    () => ({
      usuario: dados.usuario,
      criatura: dados.criatura,
      progresso: dados.progresso,
      concluidos: dados.concluidos,
      chaves:
        dados.concluidos.length > 0
          ? chavesConcluidas(dados.concluidos)
          : SEM_CHAVES,
      trilhasIniciadas: dados.trilhasIniciadas,
      carregando,
      recarregar,
    }),
    [dados, carregando, recarregar],
  );

  return (
    <ProgressoContext.Provider value={valor}>
      {children}
    </ProgressoContext.Provider>
  );
}

/** Lança se usado fora do provedor — evita estado neutro silencioso. */
export function useProgresso(): ValorProgresso {
  const valor = useContext(ProgressoContext);
  if (valor === null) {
    throw new Error(
      "useProgresso precisa de <ProvedorProgresso> acima na árvore.",
    );
  }
  return valor;
}
