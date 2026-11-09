import { fireEvent, render, screen } from "@testing-library/react";

import { PainelDeResposta } from "@/components/exercicio/PainelDeResposta";

const mockConcluir = jest.fn();
const mockRecarregar = jest.fn();
let chaves = new Set<string>();

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: { concluirExercicio: (...args: unknown[]) => mockConcluir(...args) },
  };
});

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ chaves, recarregar: mockRecarregar }),
}));

beforeEach(() => {
  chaves = new Set();
  mockRecarregar.mockReset();
  mockConcluir.mockReset().mockResolvedValue({
    aprovado: true,
    correcao: null,
    ja_concluido: false,
    xp_ganho: 50,
    sequencia: { aumentou: false },
    explicacao: "É float: / sempre devolve float.",
  });
});

it("só envia depois de escrever uma resposta de verdade", () => {
  render(<PainelDeResposta trilhaSlug="t" exercicioSlug="e" />);

  fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
  expect(mockConcluir).not.toHaveBeenCalled();
  expect(screen.getByText(/pelo menos 10 caracteres/)).toBeInTheDocument();
});

it("enviar conclui, credita e mostra a resposta de referência", async () => {
  render(<PainelDeResposta trilhaSlug="t" exercicioSlug="e" />);

  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "É float porque a divisão devolve float." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));

  expect(await screen.findByText("É float: / sempre devolve float.")).toBeInTheDocument();
  expect(mockConcluir).toHaveBeenCalledWith("t", "e");
  expect(screen.getByText("+50 XP")).toBeInTheDocument();
  expect(mockRecarregar).toHaveBeenCalled();
});

it("quem já concluiu pode rever a referência sem escrever de novo", async () => {
  chaves = new Set(["t/e"]);
  mockConcluir.mockResolvedValue({
    aprovado: true,
    correcao: null,
    ja_concluido: true,
    xp_ganho: 0,
    sequencia: { aumentou: false },
    explicacao: "Referência",
  });
  render(<PainelDeResposta trilhaSlug="t" exercicioSlug="e" />);

  fireEvent.click(screen.getByRole("button", { name: "Ver resposta de referência" }));

  expect(await screen.findByText("Referência")).toBeInTheDocument();
  expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
});
