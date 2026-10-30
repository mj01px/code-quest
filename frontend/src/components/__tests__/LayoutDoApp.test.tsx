import { render, screen } from "@testing-library/react";

import { LayoutDoApp } from "@/components/layout/LayoutDoApp";

const mockSubstituir = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockSubstituir }),
}));

jest.mock("@/components/layout/BarraLateral", () => ({
  BarraLateral: () => null,
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: jest.fn(),
}));

const progresso = jest.requireMock<{ useProgresso: jest.Mock }>(
  "@/components/progresso/ProvedorProgresso",
);

beforeEach(() => {
  jest.clearAllMocks();
});

it("aguarda a sessão antes de mostrar o conteúdo", () => {
  progresso.useProgresso.mockReturnValue({ usuario: null, carregando: true });

  render(<LayoutDoApp>Conteúdo privado</LayoutDoApp>);

  expect(screen.queryByText("Conteúdo privado")).not.toBeInTheDocument();
  expect(mockSubstituir).not.toHaveBeenCalled();
});

it("redireciona quem não está autenticado sem mostrar o conteúdo", () => {
  progresso.useProgresso.mockReturnValue({ usuario: null, carregando: false });

  render(<LayoutDoApp>Conteúdo privado</LayoutDoApp>);

  expect(screen.queryByText("Conteúdo privado")).not.toBeInTheDocument();
  expect(mockSubstituir).toHaveBeenCalledWith("/entrar");
});

it("mostra o conteúdo para o aluno autenticado", () => {
  progresso.useProgresso.mockReturnValue({
    usuario: { nickname: "aluno" },
    carregando: false,
  });

  render(<LayoutDoApp>Conteúdo privado</LayoutDoApp>);

  expect(screen.getByText("Conteúdo privado")).toBeInTheDocument();
  expect(mockSubstituir).not.toHaveBeenCalled();
});
