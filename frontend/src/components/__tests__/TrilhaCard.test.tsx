import { render, screen } from "@testing-library/react";

import { TrilhaCard } from "@/components/trilhas/TrilhaCard";

import { trilhaResumo } from "./fixtures";

// A situação aparece duas vezes de propósito: a forma curta que cabe na coluna
// do Figma, marcada aria-hidden, e a palavra inteira em sr-only.
const NA_TELA = { selector: "[aria-hidden='true']" } as const;
const NO_LEITOR_DE_TELA = { selector: ".sr-only" } as const;

describe("TrilhaCard", () => {
  it("mostra nome, descrição e duração", () => {
    render(<TrilhaCard trilha={trilhaResumo()} />);

    expect(screen.getByText("Lógica de Programação")).toBeInTheDocument();
    expect(screen.getByText(/ponto de partida.*· 9 h/)).toBeInTheDocument();
  });

  it("leva para a página da trilha", () => {
    render(<TrilhaCard trilha={trilhaResumo()} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/trilhas/logica-de-programacao",
    );
  });

  it("convida a começar quando não há progresso do aluno", () => {
    render(<TrilhaCard trilha={trilhaResumo()} />);

    expect(screen.getAllByText("Iniciar")).toHaveLength(2);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("mostra a porcentagem na coluna e a situação por extenso", () => {
    render(<TrilhaCard trilha={trilhaResumo()} progresso={65} />);

    expect(screen.getByText("65%", NA_TELA)).toBeInTheDocument();
    expect(
      screen.getByText("Em andamento", NO_LEITOR_DE_TELA),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "65",
    );
  });

  it("marca a trilha concluída", () => {
    render(<TrilhaCard trilha={trilhaResumo()} progresso={100} />);

    expect(screen.getByText("Concluída", NA_TELA)).toBeInTheDocument();
    expect(
      screen.getByText("Concluída", NO_LEITOR_DE_TELA),
    ).toBeInTheDocument();
  });

  it("avisa que a trilha ainda não tem conteúdo", () => {
    render(<TrilhaCard trilha={trilhaResumo({ total_exercicios: 0 })} />);

    expect(screen.getByText("Em breve", NA_TELA)).toBeInTheDocument();
  });
});
