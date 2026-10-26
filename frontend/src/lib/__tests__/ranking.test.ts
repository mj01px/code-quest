import { dicaDaPosicao, nomeDoMes, tempoAteFechar } from "@/lib/ranking";
import type { MinhaPosicao } from "@/lib/types";

function posicao(extra: Partial<MinhaPosicao> = {}): MinhaPosicao {
  return {
    nickname: "kiuev",
    criatura: null,
    posicao: 3,
    xp: 45,
    faltam_para_subir: 16,
    podios: 0,
    vitorias: 0,
    ...extra,
  };
}

describe("tempoAteFechar", () => {
  const agora = new Date("2026-10-28T12:00:00-03:00");

  it("mostra dias e horas quando falta mais de um dia", () => {
    expect(tempoAteFechar("2026-11-01T00:00:00-03:00", agora)).toBe("3d 12h");
  });

  it("mostra horas e minutos no último dia", () => {
    expect(tempoAteFechar("2026-10-28T17:30:00-03:00", agora)).toBe("5h 30min");
  });

  it("não fica negativo depois da virada", () => {
    expect(tempoAteFechar("2026-10-28T11:00:00-03:00", agora)).toBe("0min");
  });
});

describe("nomeDoMes", () => {
  it("formata sem deslocar o mês pelo fuso", () => {
    expect(nomeDoMes("2026-10-01")).toBe("outubro de 2026");
    expect(nomeDoMes("2027-01-01")).toBe("janeiro de 2027");
  });
});

describe("dicaDaPosicao", () => {
  it("diz quanto falta pra passar quem está acima", () => {
    expect(dicaDaPosicao(posicao())).toBe("Faltam 16 XP pro 2º");
  });

  it("avisa quando não há ninguém na frente", () => {
    expect(dicaDaPosicao(posicao({ posicao: 1, faltam_para_subir: null }))).toBe(
      "Ninguém na sua frente"
    );
  });

  it("convida a pontuar quem ainda não entrou", () => {
    expect(
      dicaDaPosicao(posicao({ posicao: null, xp: 0, faltam_para_subir: null }))
    ).toBe("Conclua um exercício para entrar no ranking do mês");
  });
});
