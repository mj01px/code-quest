import { render, screen } from "@testing-library/react";

import { ExigeLogin } from "@/components/layout/ExigeLogin";
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

  render(<ExigeLogin>Conteúdo privado</ExigeLogin>);

  expect(screen.queryByText("Conteúdo privado")).not.toBeInTheDocument();
  expect(mockSubstituir).not.toHaveBeenCalled();
});

it("redireciona quem não está autenticado sem mostrar o conteúdo", () => {
  progresso.useProgresso.mockReturnValue({ usuario: null, carregando: false });

  render(<ExigeLogin>Conteúdo privado</ExigeLogin>);

  expect(screen.queryByText("Conteúdo privado")).not.toBeInTheDocument();
  expect(mockSubstituir).toHaveBeenCalledWith("/entrar");
});

it("mostra o conteúdo para o aluno autenticado", () => {
  progresso.useProgresso.mockReturnValue({
    usuario: { nickname: "aluno" },
    carregando: false,
  });

  render(<ExigeLogin>Conteúdo privado</ExigeLogin>);

  expect(screen.getByText("Conteúdo privado")).toBeInTheDocument();
  expect(mockSubstituir).not.toHaveBeenCalled();
});

// O catálogo é vitrine pública: a moldura do app não pede login. A guarda
// fica no layout de cada rota privada (ExigeLogin).
it("a moldura do app mostra o conteúdo para o visitante, sem redirecionar", () => {
  progresso.useProgresso.mockReturnValue({ usuario: null, carregando: false });

  render(<LayoutDoApp>Catálogo público</LayoutDoApp>);

  expect(screen.getByText("Catálogo público")).toBeInTheDocument();
  expect(mockSubstituir).not.toHaveBeenCalled();
});
