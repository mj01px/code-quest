import { fireEvent, render, screen } from "@testing-library/react";

import { LeituraDaLicao } from "@/components/licao/LeituraDaLicao";
import type { Secao } from "@/lib/licao";

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ criatura: null }),
}));

const SECOES: Secao[] = [
  { id: "guardar", titulo: "1. Guardar um valor", destaque: "Leia o `=` como recebe." },
  { id: "resumo", titulo: "Resumo", destaque: null },
];

function montar() {
  render(
    <LeituraDaLicao
      secoes={SECOES}
      sobretitulo="Lógica · Módulo 01"
      titulo="Variáveis e tipos"
      minutos={6}
      rotaDeSaida="/trilhas/logica"
      depoisDaLeitura="5 perguntas de quiz."
    >
      <p>Conteúdo da lição</p>
    </LeituraDaLicao>,
  );
}

describe("LeituraDaLicao", () => {
  it("mostra a barra de foco com saída e tempo de leitura", () => {
    montar();

    expect(screen.getByRole("link", { name: "< Sair" })).toHaveAttribute("href", "/trilhas/logica");
    expect(screen.getByText("Leitura · 6 min")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Variáveis e tipos" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da lição")).toBeInTheDocument();
  });

  it("marca a seção escolhida no índice", () => {
    montar();

    fireEvent.click(screen.getByRole("link", { name: /Resumo/ }));

    expect(screen.getByRole("link", { name: /Resumo/ })).toHaveAttribute("aria-current", "location");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("não mostra o pet na leitura", () => {
    montar();

    expect(screen.queryByRole("button", { name: /Pedir uma dica/ })).not.toBeInTheDocument();
  });
});
