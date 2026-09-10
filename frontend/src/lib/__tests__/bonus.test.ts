import { bonusXp } from "@/components/__tests__/fixtures";
import { bonusDaTrilha, formatarMultiplicador } from "@/lib/bonus";

describe("bonusDaTrilha", () => {
  it("acha o bônus da trilha pedida", () => {
    const lista = [bonusXp(), bonusXp({ trilha: "python", criatura: "slyth" })];
    expect(bonusDaTrilha(lista, "python")?.criatura).toBe("slyth");
  });

  it("ignora trilha sem bônus", () => {
    expect(bonusDaTrilha([bonusXp()], "algoritmos")).toBeNull();
  });

  it("ignora multiplicador neutro, que não é bônus nenhum", () => {
    expect(bonusDaTrilha([bonusXp({ multiplicador: 1 })], "logica-de-programacao")).toBeNull();
  });

  it("lista vazia não quebra", () => {
    expect(bonusDaTrilha([], "python")).toBeNull();
  });
});

describe("formatarMultiplicador", () => {
  it("some com os centavos quando o valor é inteiro", () => {
    expect(formatarMultiplicador(2)).toBe("2");
  });

  it("usa vírgula decimal", () => {
    expect(formatarMultiplicador(1.5)).toBe("1,5");
  });

  it("arredonda na segunda casa", () => {
    expect(formatarMultiplicador(1.755)).toBe("1,76");
  });
});
