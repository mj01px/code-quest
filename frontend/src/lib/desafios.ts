import { xpDaFase } from "@/lib/derivados";
import type { DesafioApi, Dificuldade } from "@/lib/types";

export const TRILHA_DOS_DESAFIOS = "desafios-do-dia";

export interface Desafio {
  trilhaSlug: string;
  trilhaNome: string;
  moduloTitulo: string;
  slug: string;
  titulo: string;
  dificuldade: Dificuldade;
  dificuldadeLabel: string;
  tipoLabel: string;
  xp: number;
  href: string;
  /** Preview buscado à parte pela página; ausente se a busca da fase falhar. */
  enunciado?: string;
}

// O dia do desafio é o de São Paulo, o mesmo da Sequencia no backend
// (timezone.localdate com TIME_ZONE America/Sao_Paulo). Não depende do fuso do
// processo Node, que em produção pode ser UTC e viraria o dia às 21h.
export const FUSO_DO_DESAFIO = "America/Sao_Paulo";

const PARTES_DO_DIA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DO_DESAFIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** AAAA-MM-DD no fuso de São Paulo. */
export function diaEmSaoPaulo(data: Date = new Date()): string {
  const partes = Object.fromEntries(
    PARTES_DO_DIA.formatToParts(data).map((parte) => [parte.type, parte.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}

const PARTES_DA_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DO_DESAFIO,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Segundos até a próxima meia-noite em São Paulo, quando a lista do dia troca. */
export function segundosAteVirada(agora: Date = new Date()): number {
  const partes = Object.fromEntries(
    PARTES_DA_HORA.formatToParts(agora).map((parte) => [parte.type, Number(parte.value)]),
  );
  return 86_400 - ((partes.hour ?? 0) * 3600 + (partes.minute ?? 0) * 60 + (partes.second ?? 0));
}

export function desafioDaApi(desafio: DesafioApi): Desafio {
  return {
    trilhaSlug: desafio.trilha_slug,
    trilhaNome: "Desafio do dia",
    moduloTitulo: "Python",
    slug: desafio.slug,
    titulo: desafio.titulo,
    dificuldade: desafio.dificuldade,
    dificuldadeLabel: desafio.dificuldade_label,
    tipoLabel: desafio.tipo_label,
    xp: xpDaFase(desafio.dificuldade),
    href: `/desafios/${desafio.slug}`,
    enunciado: desafio.enunciado,
  };
}

/** "terça-feira, 9 de setembro", para o cabeçalho da página. */
export function dataPorExtenso(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    timeZone: FUSO_DO_DESAFIO,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function rotuloDoProximo(iso: string, posicao: number): string {
  if (posicao === 0) return "Amanhã";
  const dia = new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", {
    timeZone: FUSO_DO_DESAFIO,
    weekday: "long",
  });
  const curto = dia.split("-")[0] ?? dia;
  return curto.charAt(0).toUpperCase() + curto.slice(1);
}
