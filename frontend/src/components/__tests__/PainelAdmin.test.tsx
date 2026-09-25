import { render, screen, waitFor } from "@testing-library/react";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
    adminUsuarios: jest.fn(),
    adminNiveis: jest.fn(),
    adminPermissoes: jest.fn(),
  },
}));

const substituirRota = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: substituirRota }),
}));

const mock = jest.requireMock<{
  temSessao: jest.Mock;
  api: {
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
    exerciciosConcluidos: jest.Mock;
    trilhasIniciadas: jest.Mock;
    adminUsuarios: jest.Mock;
    adminNiveis: jest.Mock;
    adminPermissoes: jest.Mock;
  };
}>("@/lib/api");

function montar() {
  return render(
    <ProvedorProgresso>
      <PainelAdmin />
    </ProvedorProgresso>,
  );
}

const titulo = () =>
  screen.queryByRole("heading", { name: /administrador/i });

beforeEach(() => {
  jest.clearAllMocks();
  mock.temSessao.mockReturnValue(true);
  mock.api.eu.mockResolvedValue(usuario());
  mock.api.minhasCriaturas.mockResolvedValue([minhaCriatura()]);
  mock.api.meuProgresso.mockResolvedValue(progressoAtual());
  mock.api.exerciciosConcluidos.mockResolvedValue([]);
  mock.api.trilhasIniciadas.mockResolvedValue([]);
  mock.api.adminUsuarios.mockResolvedValue([]);
  mock.api.adminNiveis.mockResolvedValue([]);
  mock.api.adminPermissoes.mockResolvedValue([]);
});

describe("PainelAdmin: guarda de papel", () => {
  it("mostra o painel para administrador", async () => {
    mock.api.eu.mockResolvedValue(usuario({ is_admin: true }));
    montar();

    await waitFor(() => expect(titulo()).toBeInTheDocument());
    expect(substituirRota).not.toHaveBeenCalled();
  });

  it("redireciona aluno para /trilhas e não vaza o painel", async () => {
    montar();

    await waitFor(() =>
      expect(substituirRota).toHaveBeenCalledWith("/trilhas"),
    );
    expect(titulo()).toBeNull();
  });

  it("sem sessão vai para /entrar", async () => {
    mock.temSessao.mockReturnValue(false);
    montar();

    await waitFor(() =>
      expect(substituirRota).toHaveBeenCalledWith("/entrar"),
    );
    expect(titulo()).toBeNull();
  });
});
