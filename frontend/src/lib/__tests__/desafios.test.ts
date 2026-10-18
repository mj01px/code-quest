import { aula, exercicioResumo, trilhaDetalhe } from "@/components/__tests__/fixtures";
import { dataPorExtenso, desafiosDoDia, diaEmSaoPaulo } from "@/lib/desafios";

function trilhaCom(modulos: number, fasesPorModulo: number) {
  return trilhaDetalhe({
    aulas: Array.from({ length: modulos }, (_, m) =>
      aula({
        id: m + 1,
        titulo: `Módulo ${m + 1}`,
        slug: `modulo-${m + 1}`,
        exercicios: Array.from({ length: fasesPorModulo }, (_, f) =>
          exercicioResumo({
            id: m * 100 + f,
            titulo: `Fase ${m + 1}.${f + 1}`,
            slug: `fase-${m + 1}-${f + 1}`,
          }),
        ),
      }),
    ),
  });
}

// Instantes com fuso explicito: o dia do desafio e o de Sao Paulo, entao o
// teste nao pode depender do fuso da maquina que roda a suite.
const DIA = new Date("2026-09-09T12:00:00-03:00");

/** Faz os getters locais de Date responderem como num processo em UTC+horas. */
function simularFusoDoProcesso(horas: number): void {
  const deslocado = (data: Date) => new Date(data.getTime() + horas * 3_600_000);
  jest.spyOn(Date.prototype, "getFullYear").mockImplementation(function (this: Date) {
    return deslocado(this).getUTCFullYear();
  });
  jest.spyOn(Date.prototype, "getMonth").mockImplementation(function (this: Date) {
    return deslocado(this).getUTCMonth();
  });
  jest.spyOn(Date.prototype, "getDate").mockImplementation(function (this: Date) {
    return deslocado(this).getUTCDate();
  });
  jest.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-horas * 60);
}

describe("diaEmSaoPaulo", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("usa o calendário de São Paulo, não o UTC", () => {
    // 23h30 em São Paulo já é o dia seguinte em UTC: a chave fica no dia que o
    // aluno está vendo no relógio dele.
    expect(diaEmSaoPaulo(new Date("2026-09-10T02:30:00Z"))).toBe("2026-09-09");
  });

  it("preenche mês e dia com zero à esquerda", () => {
    expect(diaEmSaoPaulo(new Date("2026-01-05T12:00:00-03:00"))).toBe("2026-01-05");
  });

  it("não depende do fuso do processo", () => {
    // 01h30 UTC de 18/10 ainda é 22h30 de 17/10 em São Paulo. Um helper com
    // getters locais (new Date sem fuso) erraria com o processo em UTC.
    const instante = new Date("2026-10-18T01:30:00Z");
    for (const horas of [0, -3]) {
      simularFusoDoProcesso(horas);
      jest.useFakeTimers({ now: instante });
      expect(diaEmSaoPaulo()).toBe("2026-10-17");
      expect(diaEmSaoPaulo(instante)).toBe("2026-10-17");
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });
});

describe("desafiosDoDia", () => {
  it("devolve três fases", () => {
    expect(desafiosDoDia([trilhaCom(4, 4)], DIA)).toHaveLength(3);
  });

  it("é estável no mesmo dia", () => {
    const trilhas = [trilhaCom(4, 4)];
    const primeira = desafiosDoDia(trilhas, DIA).map((d) => d.slug);
    const segunda = desafiosDoDia(trilhas, new Date("2026-09-09T22:00:00-03:00")).map(
      (d) => d.slug,
    );
    expect(segunda).toEqual(primeira);
  });

  it("muda de um dia para o outro", () => {
    const trilhas = [trilhaCom(6, 5)];
    const hoje = desafiosDoDia(trilhas, DIA).map((d) => d.slug);
    const amanha = desafiosDoDia(trilhas, new Date("2026-09-10T12:00:00-03:00")).map(
      (d) => d.slug,
    );
    expect(amanha).not.toEqual(hoje);
  });

  it("não repete a mesma fase", () => {
    const escolhidos = desafiosDoDia([trilhaCom(4, 4)], DIA);
    expect(new Set(escolhidos.map((d) => d.slug)).size).toBe(3);
  });

  it("evita três desafios do mesmo módulo quando há de onde escolher", () => {
    const escolhidos = desafiosDoDia([trilhaCom(4, 4)], DIA);
    expect(new Set(escolhidos.map((d) => d.moduloTitulo)).size).toBe(3);
  });

  it("completa repetindo módulo quando o catálogo é pequeno", () => {
    // Um módulo só, com quatro fases: melhor três do mesmo módulo do que uma.
    const escolhidos = desafiosDoDia([trilhaCom(1, 4)], DIA);
    expect(escolhidos).toHaveLength(3);
    expect(new Set(escolhidos.map((d) => d.slug)).size).toBe(3);
  });

  it("devolve menos quando não há fases suficientes", () => {
    expect(desafiosDoDia([trilhaCom(1, 2)], DIA)).toHaveLength(2);
  });

  it("devolve lista vazia sem trilha publicada", () => {
    expect(desafiosDoDia([], DIA)).toEqual([]);
  });

  it("monta o link para a fase dentro da trilha", () => {
    const [primeiro] = desafiosDoDia([trilhaCom(1, 1)], DIA);
    expect(primeiro?.href).toBe(
      "/trilhas/logica-de-programacao/exercicios/fase-1-1",
    );
  });

  it("traz o XP bruto da dificuldade", () => {
    const [primeiro] = desafiosDoDia([trilhaCom(1, 1)], DIA);
    expect(primeiro?.xp).toBe(100);
  });

  it("sorteia entre todas as trilhas recebidas", () => {
    const outra = trilhaDetalhe({
      id: 200,
      nome: "Python",
      slug: "python",
      aulas: [
        aula({
          id: 50,
          titulo: "Scripts",
          slug: "scripts",
          exercicios: [exercicioResumo({ id: 500, slug: "primeiro-script" })],
        }),
      ],
    });

    const slugs = desafiosDoDia([trilhaCom(1, 8), outra], DIA, 9).map(
      (d) => d.trilhaSlug,
    );
    expect(slugs).toContain("python");
  });
});

describe("dataPorExtenso", () => {
  it("escreve o dia em português", () => {
    expect(dataPorExtenso(DIA)).toContain("setembro");
  });
});
