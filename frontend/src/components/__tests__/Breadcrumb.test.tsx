import { render, screen } from "@testing-library/react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";

describe("Breadcrumb", () => {
  it("liga os passos anteriores e deixa o último como página atual", () => {
    render(
      <Breadcrumb
        passos={[
          { rotulo: "Trilhas", href: "/trilhas" },
          { rotulo: "Lógica", href: "/trilhas/logica" },
          { rotulo: "Contar vogais" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Trilhas" })).toHaveAttribute(
      "href",
      "/trilhas",
    );
    expect(
      screen.queryByRole("link", { name: "Contar vogais" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Contar vogais")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("expõe uma navegação nomeada para leitores de tela", () => {
    render(<Breadcrumb passos={[{ rotulo: "Trilhas" }]} />);

    expect(
      screen.getByRole("navigation", { name: "Trilha de navegação" }),
    ).toBeInTheDocument();
  });
});
