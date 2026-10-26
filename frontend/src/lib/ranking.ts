import type { MinhaPosicao } from "./types";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function tempoAteFechar(fechaEm: string, agora: Date = new Date()): string {
  const restante = Math.max(0, new Date(fechaEm).getTime() - agora.getTime());
  const dias = Math.floor(restante / DIA);
  const horas = Math.floor((restante % DIA) / HORA);
  const minutos = Math.floor((restante % HORA) / MINUTO);

  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}

// "2026-10-01" vira "outubro de 2026" sem passar por Date: new Date() leria a
// data em UTC e, no fuso de SP, cairia no mês anterior.
export function nomeDoMes(iso: string): string {
  const [ano, mes] = iso.split("-");
  return `${MESES[Number(mes) - 1]} de ${ano}`;
}

export function dicaDaPosicao(voce: MinhaPosicao): string {
  if (voce.posicao === null) {
    return "Conclua um exercício para entrar no ranking do mês";
  }
  if (voce.faltam_para_subir === null) return "Ninguém na sua frente";
  return `Faltam ${voce.faltam_para_subir} XP pro ${voce.posicao - 1}º`;
}
