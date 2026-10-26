import { render, screen } from "@testing-library/react";

import { GraficoAtividade } from "@/components/dashboard/GraficoAtividade";

const semana = (xps: number[]) =>
  xps.map((xp, i) => ({ dia: `D${i}`, data: `2026-10-${10 + i}`, xp }));

describe("GraficoAtividade", () => {
  it("desenha barras proporcionais ao maior dia", () => {
    const { container } = render(
      <GraficoAtividade dias={semana([0, 50, 100, 200, 0, 0, 100])} />,
    );
    const alturas = [...container.querySelectorAll("rect")].map((r) =>
      Number(r.getAttribute("height")),
    );

    expect(alturas[3]).toBeGreaterThan(0);
    expect(alturas[2]).toBeCloseTo(alturas[3] / 2);
    expect(alturas[1]).toBeCloseTo(alturas[3] / 4);
    expect(alturas[0]).toBe(0);
    expect(screen.getByRole("img")).toHaveAccessibleName(/D3: 200 XP/);
  });

  it("semana zerada não gera NaN", () => {
    const { container } = render(<GraficoAtividade dias={semana([0, 0, 0, 0, 0, 0, 0])} />);
    const alturas = [...container.querySelectorAll("rect")].map((r) =>
      r.getAttribute("height"),
    );

    expect(alturas).toEqual(Array(7).fill("0"));
  });
});
