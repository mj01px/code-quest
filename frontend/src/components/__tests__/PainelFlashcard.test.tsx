import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelFlashcard } from "@/components/exercicio/PainelFlashcard";
import { api } from "@/lib/api";

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ recarregar: jest.fn() }),
}));
jest.mock("@/lib/api", () => ({
  api: { revelarFlashcard: jest.fn() },
}));

const revelarFlashcard = api.revelarFlashcard as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("só mostra a resposta e o XP depois de revelar", async () => {
  revelarFlashcard.mockResolvedValue({
    resposta: "Uma variável guarda um valor.",
    ja_concluido: false,
    xp_ganho: 50,
    sequencia: { atual: 1, recorde: 1, aumentou: true },
  });
  render(<PainelFlashcard trilhaSlug="logica-de-programacao" exercicioSlug="variavel-flashcard" />);

  expect(screen.queryByText(/Uma variável guarda/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Revelar resposta" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Uma variável guarda um valor.");
  expect(screen.getByRole("status")).toHaveTextContent("+50 XP · +1 dia");
  expect(revelarFlashcard).toHaveBeenCalledWith("logica-de-programacao", "variavel-flashcard");
});
