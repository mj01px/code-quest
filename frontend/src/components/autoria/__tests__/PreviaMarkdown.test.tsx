import { render, screen } from "@testing-library/react";

import { PreviaMarkdown, blocosDe } from "@/components/autoria/PreviaMarkdown";

describe("blocosDe", () => {
  it("separa título, parágrafo, lista e código", () => {
    const md = "# Variáveis\n\nUma variável\nguarda valor.\n\n- um\n- dois\n\n```\nx = 1\n```";

    expect(blocosDe(md)).toEqual([
      { tipo: "titulo", nivel: 1, texto: "Variáveis" },
      { tipo: "paragrafo", texto: "Uma variável guarda valor." },
      { tipo: "lista", itens: ["um", "dois"] },
      { tipo: "codigo", texto: "x = 1" },
    ]);
  });
});

describe("PreviaMarkdown", () => {
  it("renderiza HTML do autor como texto, nunca como marcação", () => {
    render(<PreviaMarkdown markdown={"<img src=x onerror=alert(1)>"} />);

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
