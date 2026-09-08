import { render, screen } from "@testing-library/react";

import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  it("liga apenas o que já tem rota", () => {
    render(<Sidebar />);

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/trilhas",
      "/trilhas",
    ]);
  });

  it("marca como desabilitado o que ainda não existe", () => {
    render(<Sidebar />);

    for (const rotulo of [
      "Desafio do dia",
      "Conquistas",
      "Configurações",
      "Adicionar conteúdo",
    ]) {
      expect(screen.getByText(rotulo).closest("[aria-disabled]")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
  });

  it("mostra o perfil neutro enquanto a gamificação não fornece dados", () => {
    render(<Sidebar />);

    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Nível 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("usa o perfil recebido quando ele existe", () => {
    render(
      <Sidebar
        perfil={{ nome: "Ana", nivel: 12, xp: 4450, xpDoProximoNivel: 10000 }}
      />,
    );

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Nível 12")).toBeInTheDocument();
    expect(screen.getByText("4450 / 10000 XP")).toBeInTheDocument();
  });
});
