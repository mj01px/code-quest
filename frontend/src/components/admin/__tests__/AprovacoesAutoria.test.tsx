import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AprovacoesAutoria } from "@/components/admin/AprovacoesAutoria";
import type { SolicitacaoAdmin } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: {
    adminSolicitacoes: jest.fn(),
    aprovarSolicitacao: jest.fn(),
    rejeitarSolicitacao: jest.fn(),
  },
}));

const mock = jest.requireMock<{ api: Record<string, jest.Mock> }>("@/lib/api");

const pedido: SolicitacaoAdmin = {
  id: 5,
  areas: [1],
  areas_nomes: ["Python"],
  carta_apresentacao: "Quero ensinar laços e funções.",
  portfolio_link: "https://github.com/ana",
  aceite_diretrizes: true,
  situacao: "PENDENTE",
  motivo_rejeicao: "",
  criado_em: "2026-10-28T12:00:00Z",
  solicitante: { id: "u1", nickname: "ana", email: "ana@example.com" },
};

beforeEach(() => {
  jest.clearAllMocks();
  mock.api.adminSolicitacoes.mockResolvedValue([pedido]);
  mock.api.aprovarSolicitacao.mockResolvedValue({ ...pedido, situacao: "APROVADA" });
  mock.api.rejeitarSolicitacao.mockResolvedValue({ ...pedido, situacao: "REJEITADA" });
});

describe("AprovacoesAutoria", () => {
  it("aprova só depois de confirmar no modal e tira o pedido da lista", async () => {
    render(<AprovacoesAutoria />);

    await userEvent.click(await screen.findByRole("button", { name: "Aprovar: ana" }));
    expect(mock.api.aprovarSolicitacao).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "APROVAR" }));

    expect(mock.api.aprovarSolicitacao).toHaveBeenCalledWith(5);
    await waitFor(() =>
      expect(screen.getByText("Nenhuma solicitação esperando análise.")).toBeInTheDocument(),
    );
  });

  it("rejeitar exige motivo", async () => {
    render(<AprovacoesAutoria />);

    await userEvent.click(await screen.findByRole("button", { name: "Rejeitar: ana" }));
    const confirmar = screen.getByRole("button", { name: "REJEITAR" });
    expect(confirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/MOTIVO/), "Carta genérica.");
    await userEvent.click(confirmar);

    expect(mock.api.rejeitarSolicitacao).toHaveBeenCalledWith(5, "Carta genérica.");
  });
});
