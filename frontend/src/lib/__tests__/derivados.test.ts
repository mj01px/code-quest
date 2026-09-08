import {
  aula,
  exercicioResumo,
  trilhaResumo,
} from "@/components/__tests__/fixtures";
import {
  competencias,
  duracaoEmHoras,
  fasesEmOrdem,
  nivelDaTrilha,
  proximaFase,
  resumoDoModulo,
  totalDeFases,
  totalDeProjetos,
  xpDoModulo,
} from "@/lib/derivados";
import type { Aula, TrilhaDetalhe } from "@/lib/types";

function trilhaDetalhe(aulas: Aula[]): TrilhaDetalhe {
  const { total_aulas, total_exercicios, ...resto } = trilhaResumo();
  void total_aulas;
  void total_exercicios;
  return { ...resto, aulas };
}

describe("derivados", () => {
  it("conta uma hora por fase, a razão usada nas telas", () => {
    expect(duracaoEmHoras(26)).toBe(26);
  });

  it("arredonda o XP do módulo para a dezena de 50 mais próxima", () => {
    const quatroIniciantes = aula({
      exercicios: [1, 2, 3, 4].map((id) => exercicioResumo({ id })),
    });
    expect(xpDoModulo(quatroIniciantes)).toBe(400);

    const quatroIntermediarios = aula({
      exercicios: [1, 2, 3, 4].map((id) =>
        exercicioResumo({ id, dificuldade: "INTERMEDIARIO" }),
      ),
    });
    expect(xpDoModulo(quatroIntermediarios)).toBe(500);
  });

  it("resolve o nível pela dificuldade mais frequente, empate para cima", () => {
    const trilha = trilhaDetalhe([
      aula({
        exercicios: [
          exercicioResumo({ id: 1 }),
          exercicioResumo({ id: 2, dificuldade: "AVANCADO" }),
        ],
      }),
    ]);

    expect(nivelDaTrilha(trilha)).toBe("Avançado");
  });

  it("não inventa nível para trilha sem fase publicada", () => {
    expect(nivelDaTrilha(trilhaDetalhe([aula({ exercicios: [] })]))).toBeNull();
  });

  it("conta como projeto só a fase que pede código", () => {
    const trilha = trilhaDetalhe([
      aula({
        exercicios: [
          exercicioResumo({ id: 1, tipo: "CODIGO" }),
          exercicioResumo({ id: 2, tipo: "TEORICO" }),
        ],
      }),
    ]);

    expect(totalDeProjetos(trilha)).toBe(1);
    expect(totalDeFases(trilha)).toBe(2);
  });

  it("descreve o módulo pelos títulos das primeiras fases", () => {
    const modulo = aula({
      exercicios: [
        exercicioResumo({ id: 1, titulo: "Variáveis" }),
        exercicioResumo({ id: 2, titulo: "Tipos" }),
        exercicioResumo({ id: 3, titulo: "Operadores" }),
        exercicioResumo({ id: 4, titulo: "Não deve aparecer" }),
      ],
    });

    expect(resumoDoModulo(modulo)).toBe("Variáveis, Tipos e Operadores");
  });

  it("usa os títulos dos módulos como lista de competências", () => {
    const trilha = trilhaDetalhe([
      aula({ titulo: "Variáveis e tipos" }),
      aula({ id: 11, titulo: "Condicionais" }),
    ]);

    expect(competencias(trilha)).toEqual(["Variáveis e tipos", "Condicionais"]);
  });

  it("achata a trilha na ordem em que o aluno percorre as fases", () => {
    const trilha = trilhaDetalhe([
      aula({
        titulo: "Variáveis e tipos",
        exercicios: [
          exercicioResumo({ id: 1, slug: "media" }),
          exercicioResumo({ id: 2, slug: "trocar" }),
        ],
      }),
      aula({
        id: 11,
        titulo: "Condicionais",
        slug: "condicionais",
        exercicios: [exercicioResumo({ id: 3, slug: "par" })],
      }),
    ]);

    expect(fasesEmOrdem(trilha).map((fase) => fase.slug)).toEqual([
      "media",
      "trocar",
      "par",
    ]);
    expect(fasesEmOrdem(trilha).at(-1)).toMatchObject({
      moduloTitulo: "Condicionais",
      moduloPosicao: 2,
    });
  });

  it("retoma na primeira fase não concluída, não na última marcada", () => {
    const fases = fasesEmOrdem(
      trilhaDetalhe([
        aula({
          exercicios: [
            exercicioResumo({ id: 1, slug: "media" }),
            exercicioResumo({ id: 2, slug: "trocar" }),
            exercicioResumo({ id: 3, slug: "par" }),
          ],
        }),
      ]),
    );

    // O aluno pulou "trocar" e fez "par": ele retoma no buraco que deixou.
    expect(proximaFase(fases, ["media", "par"])?.slug).toBe("trocar");
  });

  it("não devolve próxima fase quando a trilha acabou", () => {
    const fases = fasesEmOrdem(
      trilhaDetalhe([
        aula({ exercicios: [exercicioResumo({ id: 1, slug: "media" })] }),
      ]),
    );

    expect(proximaFase(fases, ["media"])).toBeNull();
  });
});
