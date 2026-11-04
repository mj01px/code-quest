import { chaveDoPasso, mapaDePassos, rotaDoPasso } from "@/lib/passos";
import type { PassoDaTrilha } from "@/lib/types";

const PASSOS: PassoDaTrilha[] = [
  {
    tipo: "LEITURA",
    aula_slug: "vars",
    exercicio_slug: null,
    titulo: "Lição: Vars",
    estado: "concluido",
  },
  {
    tipo: "QUIZ",
    aula_slug: "vars",
    exercicio_slug: null,
    titulo: "Quiz: Vars",
    estado: "liberado",
  },
  {
    tipo: "EXERCICIO",
    aula_slug: "vars",
    exercicio_slug: "media",
    titulo: "Média",
    estado: "bloqueado",
  },
];

describe("passos da trilha", () => {
  it("dá o estado de cada passo pela chave", () => {
    const mapa = mapaDePassos(PASSOS);

    expect(mapa.estado(chaveDoPasso("LEITURA", "vars"))).toBe("concluido");
    expect(mapa.estado(chaveDoPasso("EXERCICIO", "vars", "media"))).toBe(
      "bloqueado",
    );
    expect(mapa.proximo?.titulo).toBe("Quiz: Vars");
  });

  it("sem dados, não bloqueia nada", () => {
    expect(mapaDePassos(null).estado(chaveDoPasso("EXERCICIO", "x", "y"))).toBe(
      "liberado",
    );
  });

  it("monta a rota de cada tipo de passo", () => {
    expect(rotaDoPasso("t", PASSOS[0])).toBe("/trilhas/t/aulas/vars");
    expect(rotaDoPasso("t", PASSOS[1])).toBe("/trilhas/t/aulas/vars/quiz");
    expect(rotaDoPasso("t", PASSOS[2])).toBe("/trilhas/t/exercicios/media");
  });
});
