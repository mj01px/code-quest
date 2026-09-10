import type {
  Criatura,
  DocumentosLegais,
  ExercicioDetalhe,
  MinhaCriatura,
  TrilhaDetalhe,
  TrilhaResumo,
  Usuario,
} from "./types";

// No navegador tudo passa pela mesma origem, via rewrite do Next: e o que
// permite cookie httpOnly com SameSite=Lax. Nos Server Components nao existe
// origem relativa, entao a leitura publica vai direto no Django.
const BASE =
  typeof window === "undefined"
    ? `${process.env.API_ORIGIN ?? "http://localhost:8000"}/api/v1`
    : "/api/v1";

const COOKIE_SESSAO = "cq_sessao";
const COOKIE_CSRF = "csrftoken";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

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

  get naoEncontrado(): boolean {
    return this.status === 404;
  }

  temCodigo(code: string): boolean {
    return this.details.some((detalhe) => detalhe.code === code);
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

function lerCookie(nome: string): string | null {
  if (typeof document === "undefined") return null;
  const casado = document.cookie.match(
    new RegExp(`(?:^|; )${nome}=([^;]*)`),
  );
  return casado ? decodeURIComponent(casado[1]) : null;
}

/**
 * Diz se a interface deve assumir que ha sessao. Le o cookie sinalizador, que
 * nao e credencial: o token de verdade e httpOnly e o JavaScript nao o ve. O
 * servidor continua sendo a autoridade, e um 401 desmente isto a qualquer hora.
 */
export function temSessao(): boolean {
  return lerCookie(COOKIE_SESSAO) === "1";
}

async function garantirCsrf(): Promise<string | null> {
  const atual = lerCookie(COOKIE_CSRF);
  if (atual) return atual;

  try {
    await fetch(`${BASE}/auth/csrf/`, { credentials: "same-origin" });
  } catch {
    return null;
  }
  return lerCookie(COOKIE_CSRF);
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
  const csrf = await garantirCsrf();

  try {
    const resposta = await fetch(`${BASE}/auth/renovar/`, {
      method: "POST",
      credentials: "same-origin",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
    });
    return resposta.ok;
  } catch {
    return false;
  }
}

interface Opcoes {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  corpo?: unknown;
  autenticado?: boolean;
  /** Segundos de cache no servidor; sem ela a resposta nao e reaproveitada. */
  revalidacao?: number;
  /** Etiquetas de cache do Next, para invalidacao seletiva. */
  etiquetas?: string[];
}

async function requisicao<T>(
  caminho: string,
  {
    metodo = "GET",
    corpo,
    autenticado = false,
    revalidacao,
    etiquetas,
  }: Opcoes = {},
  jaRenovou = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";

  if (!METODOS_SEGUROS.has(metodo) && typeof window !== "undefined") {
    const csrf = await garantirCsrf();
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers,
      credentials: "same-origin",
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      ...(revalidacao === undefined
        ? {}
        : { next: { revalidate: revalidacao, tags: etiquetas } }),
    });
  } catch {
    throw ERRO_REDE;
  }

  if (resposta.status === 401 && autenticado && !jaRenovou) {
    if (await renovar()) {
      return requisicao<T>(
        caminho,
        { metodo, corpo, autenticado, revalidacao, etiquetas },
        true,
      );
    }
  }

  return interpretar(resposta) as Promise<T>;
}

export interface RespostaAuth {
  usuario: Usuario;
}

export interface DadosRegistro {
  email: string;
  nickname: string;
  senha: string;
  aceite_documentos: boolean;
  versao_termos: string;
  versao_privacidade: string;
}

export interface RespostaCadastro {
  email_enviado: boolean;
}

export const api = {
  documentosLegais() {
    return requisicao<DocumentosLegais>("/auth/documentos/");
  },

  registrar(dados: DadosRegistro) {
    return requisicao<RespostaCadastro>("/auth/registrar/", {
      metodo: "POST",
      corpo: dados,
    });
  },

  verificarEmail(token: string) {
    return requisicao<Usuario>("/auth/verificar/", {
      metodo: "POST",
      corpo: { token },
    });
  },

  reenviarVerificacao(email: string) {
    return requisicao<void>("/auth/verificar/reenviar/", {
      metodo: "POST",
      corpo: { email },
    });
  },

  senhaEsquecida(email: string) {
    return requisicao<void>("/auth/senha/esquecida/", {
      metodo: "POST",
      corpo: { email },
    });
  },

  redefinirSenha(dados: {
    token: string;
    senha: string;
    senha_confirmacao: string;
  }) {
    return requisicao<void>("/auth/senha/redefinir/", {
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

  sair() {
    return requisicao<void>("/auth/sair/", { metodo: "POST" });
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

  criaturaAtiva() {
    return requisicao<MinhaCriatura | null>("/eu/criaturas/ativa/", {
      autenticado: true,
    });
  },

  definirCriaturaAtiva(criatura: string) {
    return requisicao<MinhaCriatura>("/eu/criaturas/ativa/", {
      metodo: "PUT",
      corpo: { criatura },
      autenticado: true,
    });
  },

  escolherInicial(criatura: string) {
    return requisicao<MinhaCriatura>("/eu/criaturas/", {
      metodo: "POST",
      corpo: { criatura },
      autenticado: true,
    });
  },
};

// Catalogo de trilhas: leitura publica, servida a partir dos Server Components.
// Sem token, entao `autenticado` fica de fora; o cache do Next segura a carga
// durante o build estatico das rotas de trilha e exercicio.

const CATALOGO: Opcoes = { revalidacao: 60, etiquetas: ["trilhas"] };

export function buscarDocumentosLegais(): Promise<DocumentosLegais> {
  return requisicao<DocumentosLegais>("/auth/documentos/", {
    revalidacao: 300,
    etiquetas: ["documentos"],
  });
}

export function listarTrilhas(): Promise<TrilhaResumo[]> {
  return requisicao<TrilhaResumo[]>("/trilhas/", { ...CATALOGO });
}

export function buscarTrilha(slug: string): Promise<TrilhaDetalhe> {
  return requisicao<TrilhaDetalhe>(`/trilhas/${encodeURIComponent(slug)}/`, {
    ...CATALOGO,
  });
}

export function buscarExercicio(
  trilhaSlug: string,
  exercicioSlug: string,
): Promise<ExercicioDetalhe> {
  const caminho = `/exercicios/${encodeURIComponent(
    trilhaSlug,
  )}/${encodeURIComponent(exercicioSlug)}/`;
  return requisicao<ExercicioDetalhe>(caminho, { ...CATALOGO });
}
