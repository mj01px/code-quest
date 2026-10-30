import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ListaDeTrilhas } from "@/components/trilhas/ListaDeTrilhas";

import { trilhaResumo } from "./fixtures";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: { excluirRascunho: jest.fn() },
}));

const excluirRascunho = jest.requireMock<{ api: { excluirRascunho: jest.Mock } }>(
  "@/lib/api",
).api.excluirRascunho;

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

describe("ListaDeTrilhas: moderação", () => {
  beforeEach(() => excluirRascunho.mockReset());

  it("sem a permissão não mostra a lixeira", () => {
    render(<ListaDeTrilhas trilhas={TRILHAS} />);

    expect(screen.queryByRole("button", { name: /Excluir trilha publicada/ })).toBeNull();
  });

  it("exclui com motivo obrigatório e tira a trilha da lista", async () => {
    const u = userEvent.setup();
    excluirRascunho.mockResolvedValue(null);
    render(<ListaDeTrilhas trilhas={TRILHAS} podeExcluir />);

    await u.click(screen.getByRole("button", { name: "Excluir trilha publicada: Python" }));
    const confirmar = screen.getByRole("button", { name: "EXCLUIR" });
    expect(confirmar).toBeDisabled();

    await u.type(screen.getByLabelText(/MOTIVO DA EXCLUSÃO/), "  Conteúdo duplicado. ");
    await u.click(confirmar);

    expect(excluirRascunho).toHaveBeenCalledWith("trilhas", 2, "Conteúdo duplicado.");
    expect(await screen.findByText("2 trilhas")).toBeInTheDocument();
    expect(itens().some((t) => t.includes("Python"))).toBe(false);
  });

  it("erro da API fica no modal e a trilha continua", async () => {
    const u = userEvent.setup();
    const { ErroApi } = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
    excluirRascunho.mockRejectedValue(new ErroApi(403, "permission_denied", "Sem permissão."));
    render(<ListaDeTrilhas trilhas={TRILHAS} podeExcluir />);

    await u.click(screen.getByRole("button", { name: "Excluir trilha publicada: Python" }));
    await u.type(screen.getByLabelText(/MOTIVO DA EXCLUSÃO/), "Teste");
    await u.click(screen.getByRole("button", { name: "EXCLUIR" }));

    expect(await screen.findByText("Sem permissão.")).toBeInTheDocument();
    expect(screen.getByText("3 trilhas")).toBeInTheDocument();
  });
});
