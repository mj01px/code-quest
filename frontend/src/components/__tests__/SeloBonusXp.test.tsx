import { render, screen, waitFor } from "@testing-library/react";

import { bonusXp } from "@/components/__tests__/fixtures";
import { SeloBonusXp } from "@/components/gamificacao/SeloBonusXp";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: { meusBonus: jest.fn() },
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: { meusBonus: jest.Mock };
}>("@/lib/api");

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
});

describe("SeloBonusXp", () => {
  it("mostra o multiplicador da trilha", async () => {
    mock.api.meusBonus.mockResolvedValue([bonusXp()]);

    render(<SeloBonusXp trilhaSlug="logica-de-programacao" />);

    expect(
      await screen.findByText(/2x XP nesta trilha/),
    ).toBeInTheDocument();
  });

  it("cita a criatura para quem usa leitor de tela", async () => {
    mock.api.meusBonus.mockResolvedValue([bonusXp()]);

    render(<SeloBonusXp trilhaSlug="logica-de-programacao" />);

    expect(await screen.findByText(/com Shellby/)).toBeInTheDocument();
  });

  it("não aparece em trilha sem afinidade", async () => {
    mock.api.meusBonus.mockResolvedValue([bonusXp()]);

    const { container } = render(<SeloBonusXp trilhaSlug="algoritmos" />);

    await waitFor(() => expect(mock.api.meusBonus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("não consulta a API sem sessão", () => {
    mock.temSessao.mockReturnValue(false);

    const { container } = render(<SeloBonusXp trilhaSlug="logica-de-programacao" />);

    expect(mock.api.meusBonus).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("falha de rede não deixa resto na tela", async () => {
    mock.api.meusBonus.mockRejectedValue(new Error("sem conexão"));

    const { container } = render(<SeloBonusXp trilhaSlug="logica-de-programacao" />);

    await waitFor(() => expect(mock.api.meusBonus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
