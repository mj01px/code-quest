import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { AvisoAutoria, chaveAviso } from "@/components/autoria/AvisoAutoria";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    minhaSequencia: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
  },
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: Record<string, jest.Mock>;
}>("@/lib/api");

const APROVADO = usuario({
  criacao_aprovada: true,
  permissoes: ["trilhas.create", "trilhas.create_aula", "trilhas.create_exercicio"],
});

function montar() {
  return render(
    <ProvedorProgresso>
      <AvisoAutoria />
    </ProvedorProgresso>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(APROVADO);
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.minhaSequencia.mockResolvedValue({
    atual: 0,
    recorde: 0,
    feito_hoje: false,
    ultimo_dia: null,
  });
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
});

describe("AvisoAutoria", () => {
  it("parabeniza com o que a pessoa pode criar e não volta depois de fechar", async () => {
    const { unmount } = montar();

    expect(await screen.findByText("Parabéns!")).toBeInTheDocument();
    expect(
      screen.getByText(/Agora você pode criar Aulas e Exercícios\./),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ENTENDI" }));
    expect(screen.queryByText("Parabéns!")).toBeNull();
    expect(localStorage.getItem(chaveAviso(APROVADO.id))).not.toBeNull();

    // Remontar (outra visita): o /eu chega, a marca é lida e o aviso não volta.
    unmount();
    const leitura = jest.spyOn(Storage.prototype, "getItem");
    montar();
    await waitFor(() => expect(leitura).toHaveBeenCalledWith(chaveAviso(APROVADO.id)));
    expect(screen.queryByText("Parabéns!")).toBeNull();
    leitura.mockRestore();
  });

  it("não aparece sem aprovação", async () => {
    mock.api.eu.mockResolvedValue(usuario());
    montar();

    await waitFor(() => expect(mock.api.trilhasIniciadas).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByText("Parabéns!")).toBeNull();
  });
});
