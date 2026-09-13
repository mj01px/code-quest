import { render, screen } from "@testing-library/react";

import { TrilhaCard } from "@/components/trilhas/TrilhaCard";

import { trilhaResumo } from "./fixtures";

// Em andamento a coluna mostra só o percentual, e a palavra fica em sr-only.
// Nos demais estados a palavra é o que aparece, sem duplicata.
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

    expect(screen.getByText("Iniciar")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("em andamento mostra só a porcentagem, com a palavra em sr-only", () => {
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

    expect(screen.getByText("Concluída")).toBeInTheDocument();
  });

  it("iniciada sem fase feita mostra 0%, não convite para iniciar", () => {
    // O estado que não dá para deduzir do progresso: iniciada e não iniciada
    // têm zero conclusão, e só a marca do servidor separa as duas.
    render(<TrilhaCard trilha={trilhaResumo()} progresso={0} iniciada />);

    expect(screen.getByText("0%", NA_TELA)).toBeInTheDocument();
    expect(
      screen.getByText("Em andamento", NO_LEITOR_DE_TELA),
    ).toBeInTheDocument();
    expect(screen.queryByText("Iniciar")).not.toBeInTheDocument();
  });

  it("não iniciada continua convidando a começar", () => {
    render(<TrilhaCard trilha={trilhaResumo()} progresso={0} />);

    expect(screen.getByText("Iniciar")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("avisa que a trilha ainda não tem conteúdo", () => {
    render(<TrilhaCard trilha={trilhaResumo({ total_exercicios: 0 })} />);

    expect(screen.getByText("Em breve")).toBeInTheDocument();
  });

  it("não repete o número onde a palavra já basta", () => {
    // Fora do andamento, o percentual seria "100%" ao lado de "Concluída" ou
    // "0%" ao lado de "Iniciar": ruído, não informação.
    const { rerender } = render(
      <TrilhaCard trilha={trilhaResumo()} progresso={100} />,
    );
    expect(screen.queryByText("100%")).not.toBeInTheDocument();

    rerender(<TrilhaCard trilha={trilhaResumo()} progresso={0} />);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
