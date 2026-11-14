import { render, screen } from "@testing-library/react";

import NaoEncontrado from "../not-found";

// QA 2026-11-14: rota inexistente caía na página 404 padrão do Next, em inglês.
test("o 404 global fala português e leva de volta ao início", () => {
  render(<NaoEncontrado />);

  expect(
    screen.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute(
    "href",
    "/",
  );
});
