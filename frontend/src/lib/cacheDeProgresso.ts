interface Entrada<T> {
  dados: T;
  geracao: number;
}

let entrada: Entrada<unknown> | null = null;

export const pedidosDerivados = new Map<string, Promise<unknown>>();
let geracao = 0;

export function lerProgressoGuardado<T>(): Entrada<T> | null {
  return entrada as Entrada<T> | null;
}

export function guardarProgresso<T>(dados: T): number {
  geracao += 1;
  entrada = { dados, geracao };
  return geracao;
}

export function esquecerProgresso(): void {
  entrada = null;
  pedidosDerivados.clear();
}
