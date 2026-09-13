import { aula, exercicioResumo, trilhaDetalhe } from "@/components/__tests__/fixtures";
import { chaveDoDia, dataPorExtenso, desafiosDoDia } from "@/lib/desafios";

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

const DIA = new Date(2026, 8, 9);

describe("chaveDoDia", () => {
  it("usa o calendário local, não o UTC", () => {
    // 23h em São Paulo já é o dia seguinte em UTC: a chave tem que ficar no dia
    // que o aluno está vendo no relógio dele.
    expect(chaveDoDia(new Date(2026, 8, 9, 23, 30))).toBe("2026-09-09");
  });

  it("preenche mês e dia com zero à esquerda", () => {
    expect(chaveDoDia(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("desafiosDoDia", () => {
  it("devolve três fases", () => {
    expect(desafiosDoDia([trilhaCom(4, 4)], DIA)).toHaveLength(3);
  });

  it("é estável no mesmo dia", () => {
    const trilhas = [trilhaCom(4, 4)];
    const primeira = desafiosDoDia(trilhas, DIA).map((d) => d.slug);
    const segunda = desafiosDoDia(trilhas, new Date(2026, 8, 9, 22)).map(
      (d) => d.slug,
    );
    expect(segunda).toEqual(primeira);
  });

  it("muda de um dia para o outro", () => {
    const trilhas = [trilhaCom(6, 5)];
    const hoje = desafiosDoDia(trilhas, DIA).map((d) => d.slug);
    const amanha = desafiosDoDia(trilhas, new Date(2026, 8, 10)).map(
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
