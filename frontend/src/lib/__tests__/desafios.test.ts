import { dataPorExtenso, desafioDaApi, diaEmSaoPaulo } from "@/lib/desafios";

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

describe("desafioDaApi", () => {
  const api = {
    slug: "relogio-digital",
    titulo: "Relógio digital",
    enunciado: "Escreva `relogio(segundos)`.",
    tipo: "CODIGO" as const,
    tipo_label: "Código",
    dificuldade: "INTERMEDIARIO" as const,
    dificuldade_label: "Intermediário",
    trilha_slug: "desafios-do-dia",
  };

  it("leva para a rota própria do desafio, fora das trilhas", () => {
    expect(desafioDaApi(api).href).toBe("/desafios/relogio-digital");
  });

  it("guarda a trilha interna para a conclusão e o XP da dificuldade", () => {
    const desafio = desafioDaApi(api);

    expect(desafio.trilhaSlug).toBe("desafios-do-dia");
    expect(desafio.xp).toBe(100);
    expect(desafio.enunciado).toBe("Escreva `relogio(segundos)`.");
  });
});

describe("dataPorExtenso", () => {
  it("escreve o dia em português", () => {
    expect(dataPorExtenso(DIA)).toContain("setembro");
  });
});
