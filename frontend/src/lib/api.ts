import type { Criatura, MinhaCriatura, Sessao, Usuario } from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const CHAVE_ACCESS = "codequest:access";
const CHAVE_REFRESH = "codequest:refresh";

export interface DetalheErro {
  field: string | null;
  code: string;
  message: string;
}

export class ErroApi extends Error {
  status: number;
  code: string;
  details: DetalheErro[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: DetalheErro[] = [],
  ) {
    super(message);
    this.name = "ErroApi";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  porCampo(): Record<string, string> {
    const mapa: Record<string, string> = {};
    for (const detalhe of this.details) {
      if (detalhe.field && !mapa[detalhe.field]) {
        mapa[detalhe.field] = detalhe.message;
      }
    }
    return mapa;
  }
}

const ERRO_REDE = new ErroApi(
  0,
  "sem_conexao",
  "Não foi possível falar com o servidor. Ele está no ar?",
);

function ler(chave: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
  } catch {
    /* modo privado ou storage bloqueado */
  }
}

export function guardarSessao(sessao: Sessao) {
  gravar(CHAVE_ACCESS, sessao.access);
  gravar(CHAVE_REFRESH, sessao.refresh);
}

export function limparSessao() {
  gravar(CHAVE_ACCESS, null);
  gravar(CHAVE_REFRESH, null);
}

export function temSessao(): boolean {
  return ler(CHAVE_ACCESS) !== null;
}

async function interpretar(resposta: Response) {
  const texto = await resposta.text();
  const corpo = texto ? JSON.parse(texto) : null;

  if (resposta.ok) return corpo;

  const erro = corpo?.error;
  throw new ErroApi(
    resposta.status,
    erro?.code ?? "erro",
    erro?.message ?? `Falha inesperada (HTTP ${resposta.status}).`,
    erro?.details ?? [],
  );
}

async function renovar(): Promise<boolean> {
  const refresh = ler(CHAVE_REFRESH);
  if (!refresh) return false;

  try {
    const resposta = await fetch(`${BASE}/auth/renovar/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!resposta.ok) {
      limparSessao();
      return false;
    }
    const dados = await resposta.json();
    gravar(CHAVE_ACCESS, dados.access);
    if (dados.refresh) gravar(CHAVE_REFRESH, dados.refresh);
    return true;
  } catch {
    return false;
  }
}

interface Opcoes {
  metodo?: "GET" | "POST" | "PATCH" | "DELETE";
  corpo?: unknown;
  autenticado?: boolean;
}

async function requisicao<T>(
  caminho: string,
  { metodo = "GET", corpo, autenticado = false }: Opcoes = {},
  jaRenovou = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";

  if (autenticado) {
    const access = ler(CHAVE_ACCESS);
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw ERRO_REDE;
  }

  if (resposta.status === 401 && autenticado && !jaRenovou) {
    if (await renovar()) {
      return requisicao<T>(caminho, { metodo, corpo, autenticado }, true);
    }
    limparSessao();
  }

  return interpretar(resposta) as Promise<T>;
}

export interface RespostaAuth {
  usuario: Usuario;
  access: string;
  refresh: string;
}

export const api = {
  registrar(dados: {
    email: string;
    nickname: string;
    senha: string;
    senha_confirmacao: string;
  }) {
    return requisicao<RespostaAuth>("/auth/registrar/", {
      metodo: "POST",
      corpo: dados,
    });
  },

  login(dados: { email: string; senha: string }) {
    return requisicao<RespostaAuth>("/auth/login/", {
      metodo: "POST",
      corpo: dados,
    });
  },

  eu() {
    return requisicao<Usuario>("/auth/eu/", { autenticado: true });
  },

  catalogo() {
    return requisicao<Criatura[]>("/criaturas/");
  },

  minhasCriaturas() {
    return requisicao<MinhaCriatura[]>("/eu/criaturas/", { autenticado: true });
  },

  escolherInicial(criatura: string) {
    return requisicao<MinhaCriatura>("/eu/criaturas/", {
      metodo: "POST",
      corpo: { criatura },
      autenticado: true,
    });
  },
};
