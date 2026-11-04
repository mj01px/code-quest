import { fireEvent, render, screen } from "@testing-library/react";

import { PetDoExercicio } from "@/components/exercicio/PetDoExercicio";

const mockSolucao = jest.fn();
let permissoes: string[] = [];

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: { solucaoReferencia: (...args: unknown[]) => mockSolucao(...args) },
  };
});

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ criatura: null, usuario: { permissoes } }),
}));

function montar() {
  render(<PetDoExercicio trilhaSlug="t" exercicioSlug="e" aulaTitulo="Variáveis" />);
  fireEvent.click(screen.getByRole("button", { name: /Pedir uma dica/ }));
}

beforeEach(() => {
  mockSolucao.mockReset().mockResolvedValue({ solucao_autor: "def media(a, b):\n    return (a + b) / 2" });
});

it("aluno recebe só a dica, sem a resposta", () => {
  permissoes = [];
  montar();

  expect(screen.getByText(/A lição "Variáveis" explica/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Mostrar a resposta" })).not.toBeInTheDocument();
});

it("quem pode ver a solução recebe a resposta pelo pet", async () => {
  permissoes = ["trilhas.view_solution"];
  montar();

  fireEvent.click(screen.getByRole("button", { name: "Mostrar a resposta" }));

  expect(mockSolucao).toHaveBeenCalledWith("t", "e");
  expect(await screen.findByText(/return \(a \+ b\) \/ 2/)).toBeInTheDocument();
});
