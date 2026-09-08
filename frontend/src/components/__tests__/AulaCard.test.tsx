import { render, screen } from "@testing-library/react";

import { AulaCard } from "@/components/trilhas/AulaCard";

import { aula, exercicioResumo } from "./fixtures";

const TRILHA = "logica-de-programacao";

describe("AulaCard", () => {
  it("numera a fase com dois dígitos", () => {
    render(<AulaCard aula={aula()} trilhaSlug={TRILHA} posicao={1} />);

    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("lista os exercícios com dificuldade e tipo", () => {
    render(
      <AulaCard
        aula={aula({
          exercicios: [
            exercicioResumo(),
            exercicioResumo({
              id: 2,
              titulo: "Par ou ímpar",
              slug: "par-ou-impar",
              dificuldade: "INTERMEDIARIO",
              dificuldade_label: "Intermediário",
            }),
          ],
        })}
        trilhaSlug={TRILHA}
        posicao={1}
      />,
    );

    expect(screen.getByText("Média de duas notas")).toBeInTheDocument();
    expect(screen.getByText("Par ou ímpar")).toBeInTheDocument();
    expect(screen.getByText("Intermediário")).toBeInTheDocument();
  });

  it("aponta cada exercício para a rota certa", () => {
    render(<AulaCard aula={aula()} trilhaSlug={TRILHA} posicao={1} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/trilhas/${TRILHA}/exercicios/media-de-duas-notas`,
    );
  });

  it("mostra o título do pré-requisito, não o slug", () => {
    render(
      <AulaCard
        aula={aula({ pre_requisito: "variaveis-e-tipos" })}
        trilhaSlug={TRILHA}
        posicao={2}
        preRequisitoTitulo="Variáveis e tipos"
      />,
    );

    expect(screen.getByText(/requer Variáveis e tipos/)).toBeInTheDocument();
  });

  it("cai no slug quando o título do pré-requisito não veio", () => {
    render(
      <AulaCard
        aula={aula({ pre_requisito: "variaveis-e-tipos" })}
        trilhaSlug={TRILHA}
        posicao={2}
      />,
    );

    expect(screen.getByText(/requer variaveis-e-tipos/)).toBeInTheDocument();
  });

  it("não mostra pré-requisito quando não há", () => {
    render(<AulaCard aula={aula()} trilhaSlug={TRILHA} posicao={1} />);

    expect(screen.queryByText(/requer /)).not.toBeInTheDocument();
  });

  it("avisa quando a fase ainda não tem exercícios", () => {
    render(
      <AulaCard aula={aula({ exercicios: [] })} trilhaSlug={TRILHA} posicao={1} />,
    );

    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
