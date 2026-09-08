// Progresso do aluno no MVP: anônimo, local e restrito a este navegador.
//
// Não existe autenticação ainda, então não há a quem associar o progresso no
// servidor. Guardar em localStorage mantém o fluxo de pé sem inventar um
// usuário: a API continua só de leitura e nada daqui viaja para o backend.
//
// Formato gravado: { "trilha-slug": ["fase-slug", ...] }.

export const CHAVE = "codequest:progresso";

/** Trilha slug para os slugs das fases já concluídas. */
export type Progresso = Readonly<Record<string, readonly string[]>>;

const VAZIO: Progresso = Object.freeze({});

// useSyncExternalStore compara o instantâneo por identidade: sem este cache,
// cada render leria o storage de novo, devolveria outro objeto e entraria em
// laço infinito.
let cache: Progresso | null = null;

const ouvintes = new Set<() => void>();

/** Aceita só o que tem o formato esperado: o storage é editável pelo usuário. */
function normalizar(bruto: unknown): Progresso {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return VAZIO;
  }

  const limpo: Record<string, readonly string[]> = {};
  for (const [trilha, fases] of Object.entries(bruto)) {
    if (!Array.isArray(fases)) continue;
    const slugs = [
      ...new Set(fases.filter((fase): fase is string => typeof fase === "string")),
    ];
    if (slugs.length > 0) limpo[trilha] = Object.freeze(slugs);
  }

  return Object.freeze(limpo);
}

function lerDoStorage(): Progresso {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    return cru === null ? VAZIO : normalizar(JSON.parse(cru));
  } catch {
    // Storage bloqueado, ou JSON corrompido por edição manual: começa vazio.
    return VAZIO;
  }
}

function avisar(): void {
  for (const ouvinte of ouvintes) ouvinte();
}

function aoMudarEmOutraAba(evento: StorageEvent): void {
  // key null é o clear() do storage inteiro, e também nos afeta.
  if (evento.key !== null && evento.key !== CHAVE) return;
  cache = null;
  avisar();
}

export function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener("storage", aoMudarEmOutraAba);

  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) {
      window.removeEventListener("storage", aoMudarEmOutraAba);
    }
  };
}

export function instantaneo(): Progresso {
  cache ??= lerDoStorage();
  return cache;
}

/** No servidor não há storage: todo mundo começa do zero e hidrata depois. */
export function instantaneoNoServidor(): Progresso {
  return VAZIO;
}

export function concluidas(
  progresso: Progresso,
  trilhaSlug: string,
): readonly string[] {
  return progresso[trilhaSlug] ?? [];
}

export function estaConcluida(
  progresso: Progresso,
  trilhaSlug: string,
  faseSlug: string,
): boolean {
  return concluidas(progresso, trilhaSlug).includes(faseSlug);
}

export function alternar(trilhaSlug: string, faseSlug: string): void {
  const atual = instantaneo();
  const fases = concluidas(atual, trilhaSlug);
  const proximas = fases.includes(faseSlug)
    ? fases.filter((slug) => slug !== faseSlug)
    : [...fases, faseSlug];

  const proximo: Record<string, readonly string[]> = { ...atual };
  if (proximas.length > 0) {
    proximo[trilhaSlug] = Object.freeze(proximas);
  } else {
    // Trilha zerada sai do objeto, senão o storage acumula chave vazia.
    delete proximo[trilhaSlug];
  }

  cache = Object.freeze(proximo);

  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(cache));
  } catch {
    // Navegação privada ou cota estourada: vale para a sessão atual.
  }

  avisar();
}

/**
 * Percentual de 0 a 100. Fica limitado a 100 de propósito: uma fase despublicada
 * continua marcada no navegador de quem já a fez, e sem o teto a barra passaria
 * do fim.
 */
export function percentual(feitas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (feitas / total) * 100);
}

/** Só para os testes: descarta o instantâneo em cache. */
export function esquecerCache(): void {
  cache = null;
}
