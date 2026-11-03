import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CriacaoRapida } from "@/components/autoria/CriacaoRapida";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  listarTrilhas: jest.fn(),
  buscarTrilha: jest.fn(),
  api: {
    autoriaRascunhos: jest.fn(),
    detalheEditorial: jest.fn(),
  },
}));

const mock = jest.requireMock<{
  listarTrilhas: jest.Mock;
  buscarTrilha: jest.Mock;
  api: Record<string, jest.Mock>;
}>("@/lib/api");

const SO_EXERCICIOS = ["trilhas.create", "trilhas.create_exercicio"];

beforeEach(() => {
  jest.clearAllMocks();
  mock.listarTrilhas.mockResolvedValue([
    { id: 3, nome: "Python", slug: "python", descricao: "", ordem: 1, total_aulas: 1, total_exercicios: 0 },
  ]);
  mock.buscarTrilha.mockResolvedValue({ aulas: [{ id: 30, titulo: "Laços" }] });
  mock.api.autoriaRascunhos.mockResolvedValue([]);
});

describe("CriacaoRapida", () => {
  it("quem só cria exercícios escolhe entre trilhas e aulas publicadas", async () => {
    render(<CriacaoRapida permissoes={SO_EXERCICIOS} aoCriar={jest.fn()} />);

    expect(screen.queryByRole("link", { name: /NOVA TRILHA/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /NOVO EXERCÍCIO/ }));

    const trilha = await screen.findByLabelText("VINCULAR À TRILHA");
    await screen.findByRole("option", { name: "Python" });
    await userEvent.selectOptions(trilha, "Python");

    expect(mock.listarTrilhas).toHaveBeenCalled();
    expect(mock.api.autoriaRascunhos).not.toHaveBeenCalled();
    expect(mock.buscarTrilha).toHaveBeenCalledWith("python");
    expect(await screen.findByRole("option", { name: "Laços" })).toBeInTheDocument();
    // Quiz entra sem revisão: fica de fora em aula de outro.
    const tipos = screen.getByRole("group", { name: "Tipo do exercício" });
    expect(within(tipos).queryByRole("button", { name: "QUIZ" })).toBeNull();
  });

  it("quem cria trilha continua vinculando aos próprios rascunhos", async () => {
    render(
      <CriacaoRapida
        permissoes={[...SO_EXERCICIOS, "trilhas.create_trilha"]}
        aoCriar={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /NOVO EXERCÍCIO/ }));

    expect(await screen.findByText(/Você não tem trilha em rascunho/)).toBeInTheDocument();
    expect(mock.listarTrilhas).not.toHaveBeenCalled();
  });
});
