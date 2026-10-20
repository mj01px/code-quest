import { render, screen } from "@testing-library/react";

import type { ExercicioConcluido, Sequencia } from "@/lib/types";

import { SecaoStreak } from "../SecaoStreak";

// 15h de 18/10 em São Paulo: a grade vai de 05/10 a 18/10 e o XP, de 19/09 a 18/10.
const AGORA = new Date("2026-10-18T15:00:00-03:00");

function sequencia(extra: Partial<Sequencia> = {}): Sequencia {
  return { atual: 0, recorde: 0, feito_hoje: false, ultimo_dia: null, ...extra };
}

function conclusao(criado_em: string, xp = 50): ExercicioConcluido {
  return { trilha_slug: "logica", exercicio_slug: criado_em, xp, criado_em };
}

function estadoDo(container: HTMLElement, dia: string): string | null {
  return container.querySelector(`[data-dia="${dia}"]`)?.getAttribute("data-estado") ?? null;
}

describe("SecaoStreak", () => {
  it("com sequência em andamento, mostra os números e o próximo passo", () => {
    render(
      <SecaoStreak
        sequencia={sequencia({ atual: 3, recorde: 7 })}
        concluidos={[]}
        agora={AGORA}
      />,
    );

    expect(screen.getByRole("heading", { name: "Sua sequência" })).toBeInTheDocument();
    expect(screen.getByText("DIAS SEGUIDOS")).toBeInTheDocument();
    expect(screen.getByText("3 dias")).toBeInTheDocument();
    expect(screen.getByText("7 dias")).toBeInTheDocument();
    expect(
      screen.getByText("Conclua uma fase hoje para chegar a 4 dias seguidos."),
    ).toBeInTheDocument();
  });

  it("com sequência zerada, convida a começar", () => {
    render(<SecaoStreak sequencia={sequencia()} concluidos={[]} agora={AGORA} />);

    expect(screen.getAllByText("0 dias")).toHaveLength(2);
    expect(
      screen.getByText("Conclua uma fase hoje para começar sua sequência."),
    ).toBeInTheDocument();
  });

  it("a grade marca os dias com conclusão, no fuso de São Paulo, e destaca hoje", () => {
    const { container } = render(
      <SecaoStreak
        sequencia={sequencia({ atual: 1, recorde: 1 })}
        concluidos={[
          conclusao("2026-10-17T20:00:00-03:00"),
          conclusao("2026-10-12T10:00:00-03:00"),
          // 02h UTC de 05/10 ainda é 04/10 em São Paulo: fica fora da grade.
          conclusao("2026-10-05T02:00:00Z"),
        ]}
        agora={AGORA}
      />,
    );

    expect(container.querySelectorAll("[data-dia]")).toHaveLength(14);
    expect(estadoDo(container, "2026-10-17")).toBe("feito");
    expect(estadoDo(container, "2026-10-12")).toBe("feito");
    expect(estadoDo(container, "2026-10-18")).toBe("hoje");
    expect(estadoDo(container, "2026-10-05")).toBe("vazio");
    expect(
      screen.getByRole("img", { name: "Últimos 14 dias: 2 com fase concluída" }),
    ).toBeInTheDocument();
  });

  it("soma o XP só dos últimos 30 dias", () => {
    render(
      <SecaoStreak
        sequencia={sequencia({ atual: 1, recorde: 1, feito_hoje: true })}
        concluidos={[
          conclusao("2026-10-18T09:00:00-03:00", 50),
          conclusao("2026-09-19T09:00:00-03:00", 100),
          conclusao("2026-09-18T09:00:00-03:00", 999),
        ]}
        agora={AGORA}
      />,
    );

    expect(screen.getByText("XP EM 30 DIAS").nextElementSibling).toHaveTextContent("150");
    expect(
      screen.getByText("Sequência garantida hoje. Volte amanhã para manter o ritmo."),
    ).toBeInTheDocument();
  });
});
