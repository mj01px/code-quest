"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, temSessao } from "@/lib/api";
import { guardarProgresso, lerProgressoGuardado } from "@/lib/cacheDeProgresso";
import { chavesConcluidas, chavesDasEtapas, normalizar } from "@/lib/progresso";
import type {
  EtapaConcluida,
  ExercicioConcluido,
  MinhaCriatura,
  ProgressoAtual,
  Sequencia,
  Usuario,
} from "@/lib/types";


const VAZIO: readonly ExercicioConcluido[] = Object.freeze([]);
const SEM_CHAVES: ReadonlySet<string> = Object.freeze(new Set<string>());
const SEM_TRILHAS: ReadonlySet<string> = Object.freeze(new Set<string>());

export interface ValorProgresso {
  usuario: Usuario | null;
  /** A criatura ativa; sem ela o sprite cai no avatar neutro. */
  criatura: MinhaCriatura | null;
  progresso: ProgressoAtual | null;
  sequencia: Sequencia | null;
  concluidos: readonly ExercicioConcluido[];
  chaves: ReadonlySet<string>;
  /** Leituras e quizzes concluídos. A chave vem de `chaveDaEtapa`. */
  etapas: readonly EtapaConcluida[];
  chavesDeEtapas: ReadonlySet<string>;
  /** Slugs das trilhas que o aluno iniciou, mesmo sem fase concluída. */
  trilhasIniciadas: ReadonlySet<string>;
  /** Verdadeiro até a primeira resposta chegar. Quem desenha número espera. */
  carregando: boolean;
  /**
   * A API falhou com a sessão ainda viva (500, rede, prazo). Não é "deslogado":
   * as guardas mostram o aviso em vez de mandar para /entrar, que entraria em loop.
   */
  erro: boolean;
  /** Sobe a cada leitura bem-sucedida: quem deriva dados do progresso relê só quando ela muda. */
  geracao: number;
  /** Relê tudo. Chamado após o POST de conclusão e pelo "tentar de novo". */
  recarregar: () => void;
}

// Releituras automáticas depois de uma falha; passado isso, só o botão.
const TENTATIVAS_AUTOMATICAS = 2;

const ProgressoContext = createContext<ValorProgresso | null>(null);

interface Dados {
  usuario: Usuario | null;
  criatura: MinhaCriatura | null;
  progresso: ProgressoAtual | null;
  sequencia: Sequencia | null;
  concluidos: readonly ExercicioConcluido[];
  etapas: readonly EtapaConcluida[];
  trilhasIniciadas: ReadonlySet<string>;
}

const SEM_DADOS: Dados = Object.freeze({
  usuario: null,
  criatura: null,
  progresso: null,
  sequencia: null,
  concluidos: VAZIO,
  etapas: [],
  trilhasIniciadas: SEM_TRILHAS,
});

export function ProvedorProgresso({ children }: { children: ReactNode }) {
  const [guardado] = useState(() =>
    temSessao() ? lerProgressoGuardado<Dados>() : null,
  );
  const [dados, setDados] = useState<Dados>(guardado?.dados ?? SEM_DADOS);
  const [geracao, setGeracao] = useState(guardado?.geracao ?? 0);
  const [carregando, setCarregando] = useState(guardado === null);
  const [erro, setErro] = useState(false);
  const [versao, setVersao] = useState(0); // gatilho do recarregar()
  const falhas = useRef(0);

  const recarregar = useCallback(() => {
    falhas.current = 0;
    setVersao((n) => n + 1);
  }, []);

  useEffect(() => {
    let ativo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;

    // Sem sessão, resolve direto pra null.
    const pedido = temSessao()
      ? Promise.all([
          api.eu(),
          api.minhasCriaturas(),
          api.meuProgresso(),
          api.minhaSequencia(),
          api.exerciciosConcluidos(),
          api.trilhasIniciadas(),
          Promise.resolve()
            .then(() => api.etapasConcluidas())
            .catch(() => []),
        ])
      : Promise.resolve(null);

    pedido
      .then((resposta) => {
        if (!ativo) return;
        falhas.current = 0;
        setErro(false);
        if (resposta === null) {
          setDados(SEM_DADOS);
          return;
        }
        const [usuario, criaturas, progresso, sequencia, concluidos, iniciadas, etapas] =
          resposta;
        const novos: Dados = {
          usuario,
          criatura: criaturas.find((c) => c.ativa) ?? criaturas[0] ?? null,
          progresso,
          sequencia,
          concluidos: normalizar(concluidos),
          etapas: Array.isArray(etapas) ? etapas : [],
          trilhasIniciadas: new Set(iniciadas),
        };
        setDados(novos);
        setGeracao(guardarProgresso(novos));
      })
      .catch(() => {
        if (!ativo) return;
        // Sessão morta: o api.ts já tentou renovar e apagou o cookie-sinal.
        // Aí é visitante de fato, e mandar para /entrar uma vez está certo.
        if (!temSessao()) {
          setErro(false);
          setDados(SEM_DADOS);
          return;
        }
        // API fora com sessão viva: mantém o que já havia e avisa.
        setErro(true);
        if (falhas.current < TENTATIVAS_AUTOMATICAS) {
          falhas.current += 1;
          espera = setTimeout(
            () => setVersao((n) => n + 1),
            2000 * falhas.current,
          );
        }
      })
      .finally(() => {
        // Garante que o loading sai mesmo com erro.
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [versao]);

  const chaves = useMemo(
    () =>
      dados.concluidos.length > 0 ? chavesConcluidas(dados.concluidos) : SEM_CHAVES,
    [dados.concluidos],
  );
  const chavesDeEtapas = useMemo(() => chavesDasEtapas(dados.etapas), [dados.etapas]);

  const valor = useMemo<ValorProgresso>(
    () => ({
      usuario: dados.usuario,
      criatura: dados.criatura,
      progresso: dados.progresso,
      sequencia: dados.sequencia,
      concluidos: dados.concluidos,
      chaves,
      etapas: dados.etapas,
      chavesDeEtapas,
      trilhasIniciadas: dados.trilhasIniciadas,
      carregando,
      erro,
      geracao,
      recarregar,
    }),
    [dados, chaves, chavesDeEtapas, geracao, carregando, erro, recarregar],
  );

  return (
    <ProgressoContext.Provider value={valor}>
      {children}
    </ProgressoContext.Provider>
  );
}

/** Lança se usado fora do provedor, para evitar estado neutro silencioso. */
export function useProgresso(): ValorProgresso {
  const valor = useContext(ProgressoContext);
  if (valor === null) {
    throw new Error(
      "useProgresso precisa de <ProvedorProgresso> acima na árvore.",
    );
  }
  return valor;
}
