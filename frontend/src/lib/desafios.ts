import { xpDaFase } from "@/lib/derivados";
import type { Dificuldade, TrilhaDetalhe } from "@/lib/types";

// Os desafios do dia saem do próprio catálogo publicado, e não de uma lista
// fixa: assim eles apontam para fases que existem de verdade e acompanham o
// conteúdo conforme ele cresce. A escolha é determinística a partir da data,
// então servidor e navegador chegam à mesma lista no mesmo dia, sem estado
// guardado em lugar nenhum.
//
// Não há pontuação aqui: o desafio do dia é um atalho para a fase, e quem
// credita conclusão continua sendo o botão da própria fase.

export const TOTAL_DE_DESAFIOS = 3;

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

/** FNV-1a de 32 bits: embaralha sem depender de Math.random. */
function embaralhar(texto: string): number {
  let hash = 0x811c9dc5;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function achatar(trilhas: readonly TrilhaDetalhe[]): Desafio[] {
  return trilhas.flatMap((trilha) =>
    trilha.aulas.flatMap((aula) =>
      aula.exercicios.map((exercicio) => ({
        trilhaSlug: trilha.slug,
        trilhaNome: trilha.nome,
        moduloTitulo: aula.titulo,
        slug: exercicio.slug,
        titulo: exercicio.titulo,
        dificuldade: exercicio.dificuldade,
        dificuldadeLabel: exercicio.dificuldade_label,
        tipoLabel: exercicio.tipo_label,
        xp: xpDaFase(exercicio.dificuldade),
        href: `/trilhas/${trilha.slug}/exercicios/${exercicio.slug}`,
      })),
    ),
  );
}

/**
 * As fases do dia, sorteadas pela data. Evita repetir módulo enquanto houver
 * de onde escolher, para os três desafios não caírem todos no mesmo assunto.
 */
export function desafiosDoDia(
  trilhas: readonly TrilhaDetalhe[],
  data: Date,
  quantidade: number = TOTAL_DE_DESAFIOS,
): Desafio[] {
  const dia = diaEmSaoPaulo(data);

  const ordenados = achatar(trilhas)
    .map((desafio) => ({
      desafio,
      ordem: embaralhar(`${dia}:${desafio.trilhaSlug}/${desafio.slug}`),
    }))
    // Empate de hash é raro, mas o slug garante ordem estável quando acontece.
    .sort((a, b) => a.ordem - b.ordem || a.desafio.slug.localeCompare(b.desafio.slug))
    .map((item) => item.desafio);

  const escolhidos: Desafio[] = [];
  const modulos = new Set<string>();

  for (const desafio of ordenados) {
    if (escolhidos.length === quantidade) break;
    if (modulos.has(desafio.moduloTitulo)) continue;
    modulos.add(desafio.moduloTitulo);
    escolhidos.push(desafio);
  }

  // Catálogo pequeno: completa repetindo módulo em vez de devolver menos.
  for (const desafio of ordenados) {
    if (escolhidos.length === quantidade) break;
    if (escolhidos.includes(desafio)) continue;
    escolhidos.push(desafio);
  }

  return escolhidos;
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
