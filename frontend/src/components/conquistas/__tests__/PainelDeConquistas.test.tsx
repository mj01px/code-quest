import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { conquista } from "@/components/__tests__/fixtures";
import { PainelDeConquistas } from "@/components/conquistas/PainelDeConquistas";
import { api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  api: { minhasConquistas: jest.fn() },
}));

const minhasConquistas = api.minhasConquistas as jest.MockedFunction<
  typeof api.minhasConquistas
>;

const CATALOGO = [
  conquista({
    desbloqueada: true,
    vista: true,
    desbloqueada_em: "2026-10-18T15:00:00Z",
    progresso: 1,
    raridade: 50,
  }),
  conquista({
    slug: "aquecendo-os-motores",
    nome: "Aquecendo os Motores",
    descricao: "Conclua 5 exercícios.",
    icone: "chama",
    progresso: 3,
    meta: 5,
    raridade: 12.5,
  }),
  conquista({
    slug: null,
    nome: "???",
    descricao: "Conquista oculta. Continue jogando para descobrir.",
    icone: "oculta",
    oculta: true,
    progresso: null,
    meta: null,
  }),
];

beforeEach(() => {
  jest.clearAllMocks();
  minhasConquistas.mockResolvedValue(CATALOGO);
});

describe("PainelDeConquistas", () => {
  it("desenha o mapa só com ícone e nome, e o contador", async () => {
    render(<PainelDeConquistas />);

    expect(
      await screen.findByLabelText("1 de 3 conquistas desbloqueadas"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Aquecendo os Motores")).toBeInTheDocument();
    expect(screen.queryByText("Conclua 5 exercícios.")).not.toBeInTheDocument();
  });

  it("abre o modal com os detalhes da conquista desbloqueada", async () => {
    const usuario = userEvent.setup();
    render(<PainelDeConquistas />);

    await usuario.click(
      await screen.findByRole("button", { name: /Hello, World!, desbloqueada/ }),
    );

    const modal = screen.getByRole("dialog", { name: "Hello, World!" });
    expect(modal).toHaveAccessibleDescription("Conclua seu primeiro exercício.");
    expect(within(modal).getByText("CONQUISTA DESBLOQUEADA")).toBeInTheDocument();
    expect(within(modal).getByText("18/10/2026")).toBeInTheDocument();
    expect(within(modal).getByText("50% dos alunos")).toBeInTheDocument();
    expect(within(modal).queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("mostra o progresso parcial no modal da bloqueada", async () => {
    const usuario = userEvent.setup();
    render(<PainelDeConquistas />);

    await usuario.click(
      await screen.findByRole("button", { name: /Aquecendo os Motores, bloqueada/ }),
    );

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("BLOQUEADA")).toBeInTheDocument();
    expect(within(modal).getByText("3 / 5")).toBeInTheDocument();
    expect(within(modal).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
    expect(within(modal).getByText("12,5% dos alunos")).toBeInTheDocument();
  });

  it("oculta não revela nada no modal", async () => {
    const usuario = userEvent.setup();
    render(<PainelDeConquistas />);

    await usuario.click(await screen.findByRole("button", { name: /\?\?\?/ }));

    const modal = screen.getByRole("dialog", { name: "???" });
    expect(within(modal).getByText("CONQUISTA OCULTA")).toBeInTheDocument();
    expect(within(modal).queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("fecha pelo botão, pelo Esc e devolve o foco", async () => {
    const usuario = userEvent.setup();
    render(<PainelDeConquistas />);

    const no = await screen.findByRole("button", { name: /Hello, World!/ });
    await usuario.click(no);
    await usuario.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(no).toHaveFocus();

    await usuario.click(no);
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("avisa quando a API falha", async () => {
    minhasConquistas.mockRejectedValue(new Error("fora do ar"));

    render(<PainelDeConquistas />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as conquistas",
    );
  });
});
