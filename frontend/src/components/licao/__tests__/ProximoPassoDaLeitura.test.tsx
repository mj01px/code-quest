import { render, screen } from "@testing-library/react";

import { ProximoPassoDaLeitura } from "@/components/licao/ProximoPassoDaLeitura";

const TRILHA = "/trilhas/logica-de-programacao";
const QUIZ = `${TRILHA}/aulas/variaveis-e-tipos/quiz`;
const PRATICA = `${TRILHA}/exercicios/fatorial`;
const PROXIMO = `${TRILHA}/aulas/funcoes`;

function link(nome: string) {
  return screen.queryByRole("link", { name: nome });
}

describe("ProximoPassoDaLeitura", () => {
  it("com quiz, o caminho é o quiz, que já leva aos exercícios", () => {
    render(
      <ProximoPassoDaLeitura
        rotaQuiz={QUIZ}
        rotaPratica={PRATICA}
        rotaProximoModulo={PROXIMO}
        rotaTrilha={TRILHA}
      />,
    );

    expect(link("Fazer o quiz")).toHaveAttribute("href", QUIZ);
    expect(link("Praticar")).toBeNull();
    expect(link("Próximo módulo")).toHaveAttribute("href", PROXIMO);
  });

  it("sem quiz, leva aos exercícios do próprio módulo antes do próximo", () => {
    render(
      <ProximoPassoDaLeitura
        rotaQuiz={null}
        rotaPratica={PRATICA}
        rotaProximoModulo={PROXIMO}
        rotaTrilha={TRILHA}
      />,
    );

    expect(link("Praticar")).toHaveAttribute("href", PRATICA);
    expect(link("Próximo módulo")).toHaveAttribute("href", PROXIMO);
    expect(link("Voltar para a trilha")).toBeNull();
  });

  it("no último módulo sem quiz, ainda oferece os exercícios", () => {
    render(
      <ProximoPassoDaLeitura
        rotaQuiz={null}
        rotaPratica={PRATICA}
        rotaProximoModulo={null}
        rotaTrilha={TRILHA}
      />,
    );

    expect(link("Praticar")).toHaveAttribute("href", PRATICA);
    expect(link("Próximo módulo")).toBeNull();
  });

  it("sem quiz, exercícios nem próximo módulo, volta para a trilha", () => {
    render(
      <ProximoPassoDaLeitura
        rotaQuiz={null}
        rotaPratica={null}
        rotaProximoModulo={null}
        rotaTrilha={TRILHA}
      />,
    );

    expect(link("Voltar para a trilha")).toHaveAttribute("href", TRILHA);
  });
});
