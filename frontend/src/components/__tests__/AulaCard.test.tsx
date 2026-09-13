import { render, screen } from "@testing-library/react";

import { AulaCard } from "@/components/trilhas/AulaCard";

import { aula, exercicioResumo } from "./fixtures";

const TRILHA = "logica-de-programacao";

describe("AulaCard", () => {
  it("numera o módulo com dois dígitos", () => {
    render(<AulaCard aula={aula()} trilhaSlug={TRILHA} posicao={3} />);

    // O módulo e as fases dentro dele são numerados do mesmo jeito, então a
    // busca precisa da posição do módulo, e não de um "01" qualquer.
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("numera cada fase dentro do módulo", () => {
    render(
      <AulaCard
        aula={aula({
          exercicios: [
            exercicioResumo(),
            exercicioResumo({ id: 2, slug: "outra", titulo: "Outra" }),
          ],
        })}
        trilhaSlug={TRILHA}
        posicao={3}
      />,
    );

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("troca o número pela marca de concluída", () => {
    render(
      <AulaCard
        aula={aula({ exercicios: [exercicioResumo()] })}
        trilhaSlug={TRILHA}
        posicao={3}
        fasesConcluidas={new Set(["media-de-duas-notas"])}
      />,
    );

    expect(screen.queryByText("01")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Fase 1, concluída/, { selector: ".sr-only" }),
    ).toBeInTheDocument();
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
      <AulaCard
        aula={aula({ exercicios: [] })}
        trilhaSlug={TRILHA}
        posicao={1}
      />,
    );

    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
