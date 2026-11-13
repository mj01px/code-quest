export const EVENTO_LIMITE = "cq:limite";

/**
 * Avisa a interface de que a API barrou o ritmo (429 do throttle). `segundos`
 * vem do Retry-After; NaN ou 0 quando o servidor nao informou.
 */
export function avisarLimite(segundos: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<number>(EVENTO_LIMITE, { detail: segundos }));
}
