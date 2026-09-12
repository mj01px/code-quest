import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ListaDeTrilhas } from "@/components/trilhas/ListaDeTrilhas";

import { trilhaResumo } from "./fixtures";

const TRILHAS = [
  trilhaResumo(),
  trilhaResumo({
    id: 2,
    nome: "Python",
    slug: "python",
    descricao: "Scripts.",
  }),
  trilhaResumo({
    id: 3,
    nome: "Terminal",
    slug: "terminal",
    descricao: "Git.",
  }),
];

function itens() {
  return screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
}

describe("ListaDeTrilhas", () => {
  it("lista todas as trilhas por padrão", () => {
    render(<ListaDeTrilhas trilhas={TRILHAS} />);

    expect(screen.getByText("3 trilhas")).toBeInTheDocument();
    expect(itens()).toHaveLength(3);
  });

  it("busca sem exigir acento", async () => {
    render(<ListaDeTrilhas trilhas={TRILHAS} />);

    await userEvent.type(screen.getByLabelText("Buscar trilha"), "logica");

    expect(itens()).toHaveLength(1);
    expect(screen.getByText("Lógica de Programação")).toBeInTheDocument();
  });

  it("filtra por situação usando o progresso recebido", async () => {
    render(
      <ListaDeTrilhas
        trilhas={TRILHAS}
        progressoPorSlug={{ python: 40, terminal: 100 }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Em andamento" }));
    expect(itens()).toHaveLength(1);
    expect(screen.getByText("Python")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Concluídas" }));
    expect(screen.getByText("Terminal")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Não iniciadas" }),
    );
    expect(screen.getByText("Lógica de Programação")).toBeInTheDocument();
  });

  it("explica quando o filtro não deixa nada", async () => {
    render(<ListaDeTrilhas trilhas={TRILHAS} />);

    await userEvent.type(screen.getByLabelText("Buscar trilha"), "rust");

    expect(screen.getByText(/Nenhuma trilha encontrada/)).toBeInTheDocument();
  });

  it("marca o filtro ativo para leitores de tela", async () => {
    render(<ListaDeTrilhas trilhas={TRILHAS} />);

    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Concluídas" }));
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
