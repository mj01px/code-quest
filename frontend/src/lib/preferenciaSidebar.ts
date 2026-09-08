export const CHAVE = "codequest:sidebar";
export const FECHADA = "fechada";

// A fonte da verdade é o atributo no <html>, gravado antes da hidratação pelo
// script do layout. Guardar o estado só em React faria a sidebar recolhida
// piscar aberta em todo carregamento de página.
const ouvintes = new Set<() => void>();

export function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function estaAberta(): boolean {
  return document.documentElement.dataset.sidebar !== FECHADA;
}

export function estaAbertaNoServidor(): boolean {
  return true;
}

export function alternar(): void {
  const proxima = !estaAberta();

  if (proxima) {
    delete document.documentElement.dataset.sidebar;
  } else {
    document.documentElement.dataset.sidebar = FECHADA;
  }

  try {
    window.localStorage.setItem(CHAVE, proxima ? "aberta" : FECHADA);
  } catch {
    // Navegação privada ou storage bloqueado: a sessão atual continua valendo.
  }

  for (const ouvinte of ouvintes) ouvinte();
}
