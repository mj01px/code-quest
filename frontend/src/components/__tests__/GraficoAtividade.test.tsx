import { render, screen } from "@testing-library/react";

import { GraficoAtividade, type Serie } from "@/components/dashboard/GraficoAtividade";

type Dia = { dia: string; data: string; xp: number; outro: number };

const semana = (xps: number[]): Dia[] =>
  xps.map((xp, i) => ({ dia: `D${i}`, data: `2026-10-${10 + i}`, xp, outro: 0 }));

const XP: Serie<Dia> = { chave: "xp", cor: "#A855F7", nome: "XP" };

const alturas = (container: HTMLElement) =>
  [...container.querySelectorAll("rect")].map((r) => r.getAttribute("height"));

describe("GraficoAtividade", () => {
  it("desenha barras proporcionais ao maior dia", () => {
    const { container } = render(
      <GraficoAtividade
        titulo="Semana"
        dias={semana([0, 50, 100, 200, 0, 0, 100])}
        series={[XP]}
      />,
    );
    const h = alturas(container).map(Number);

    expect(h[3]).toBeGreaterThan(0);
    expect(h[2]).toBeCloseTo(h[3] / 2);
    expect(h[1]).toBeCloseTo(h[3] / 4);
    expect(h[0]).toBe(0);
    expect(screen.getByRole("img")).toHaveAccessibleName(/D3: 200 XP/);
  });

  it("semana zerada não gera NaN", () => {
    const { container } = render(
      <GraficoAtividade titulo="Semana" dias={semana([0, 0, 0, 0, 0, 0, 0])} series={[XP]} />,
    );

    expect(alturas(container)).toEqual(Array(7).fill("0"));
  });

  it("desenha uma barra por série em cada dia, com legenda", () => {
    const { container } = render(
      <GraficoAtividade
        titulo="Semana"
        dias={semana([10, 0, 0, 0, 0, 0, 0])}
        series={[XP, { chave: "outro", cor: "#f87171", nome: "Outro" }]}
      />,
    );

    expect(alturas(container)).toHaveLength(14);
    expect(screen.getByText("OUTRO")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/D0: 10 XP e 0 Outro/);
  });
});
