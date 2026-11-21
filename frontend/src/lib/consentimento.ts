export const EVENTO_CONSENTIMENTO = "cq:consentimento-pendente";

export function avisarConsentimentoPendente(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO));
}

export function recarregarPagina(): void {
  window.location.reload();
}
