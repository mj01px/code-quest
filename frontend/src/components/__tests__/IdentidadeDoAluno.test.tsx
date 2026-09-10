import { render, screen, waitFor } from "@testing-library/react";

import { minhaCriatura, usuario } from "@/components/__tests__/fixtures";
import { IdentidadeDoAluno } from "@/components/layout/IdentidadeDoAluno";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: { eu: jest.fn(), minhasCriaturas: jest.fn() },
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: { eu: jest.Mock; minhasCriaturas: jest.Mock };
}>("@/lib/api");

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
});

describe("IdentidadeDoAluno", () => {
  it("troca o nome neutro pelo nickname", async () => {
    render(<IdentidadeDoAluno nome="Visitante" nivel={1} />);

    expect(await screen.findByText("aluno_teste")).toBeInTheDocument();
  });

  it("troca o ovo pela criatura escolhida", async () => {
    render(<IdentidadeDoAluno nome="Visitante" nivel={1} />);

    expect(
      await screen.findByAltText("Shellby, sua criatura"),
    ).toBeInTheDocument();
  });

  it("prefere a criatura ativa quando há mais de uma", async () => {
    mock.api.minhasCriaturas.mockResolvedValue([
      minhaCriatura({ id: 2, ativa: false, sprite: "/criaturas/blaze_stage_1.png" }),
      minhaCriatura({ id: 1, ativa: true }),
    ]);

    render(<IdentidadeDoAluno nome="Visitante" nivel={1} />);

    const imagem = await screen.findByAltText("Shellby, sua criatura");
    expect(imagem.getAttribute("src")).toContain("shellby_stage_1");
  });

  it("mantém o estado neutro sem sessão", () => {
    mock.temSessao.mockReturnValue(false);

    render(<IdentidadeDoAluno nome="Visitante" nivel={1} />);

    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(mock.api.eu).not.toHaveBeenCalled();
  });

  it("quem ainda não escolheu criatura vê o nickname e o avatar padrão", async () => {
    mock.api.minhasCriaturas.mockResolvedValue([]);

    render(<IdentidadeDoAluno nome="Visitante" nivel={1} />);

    expect(await screen.findByText("aluno_teste")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("erro na API não derruba a sidebar", async () => {
    mock.api.eu.mockRejectedValue(new Error("sem conexão"));

    render(<IdentidadeDoAluno nome="Visitante" nivel={7} />);

    await waitFor(() => expect(mock.api.eu).toHaveBeenCalled());
    expect(screen.getByText("Visitante")).toBeInTheDocument();
    expect(screen.getByText("Nível 7")).toBeInTheDocument();
  });
});
