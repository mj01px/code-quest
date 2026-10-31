import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GerenciadorFlashcards } from "@/components/autoria/GerenciadorFlashcards";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: {
    criarFlashcard: jest.fn(),
    editarFlashcard: jest.fn(),
    excluirFlashcard: jest.fn(),
  },
}));

const mock = jest.requireMock<{ api: Record<string, jest.Mock> }>("@/lib/api");

const card = { id: 1, pergunta: "O que é let?", resposta: "Variável de bloco." };

beforeEach(() => jest.clearAllMocks());

it("adiciona um card na aula e mostra a frente", async () => {
  mock.api.criarFlashcard.mockResolvedValue(card);
  render(<GerenciadorFlashcards aula={7} />);

  await userEvent.type(screen.getByLabelText("FRENTE (PERGUNTA)"), card.pergunta);
  await userEvent.type(screen.getByLabelText("VERSO (RESPOSTA)"), card.resposta);
  await userEvent.click(screen.getByRole("button", { name: "+ ADICIONAR CARD" }));

  expect(mock.api.criarFlashcard).toHaveBeenCalledWith({ aula: 7, pergunta: card.pergunta, resposta: card.resposta });
  expect(await screen.findByText(card.pergunta)).toBeInTheDocument();
  expect(screen.getByLabelText("FRENTE (PERGUNTA)")).toHaveValue("");
});

it("virar card troca pergunta por resposta", async () => {
  render(<GerenciadorFlashcards aula={7} iniciais={[card]} />);

  const virar = screen.getByRole("button", { pressed: false });
  await userEvent.click(virar);

  expect(virar).toHaveAttribute("aria-pressed", "true");
  expect(virar).toHaveTextContent(card.resposta);
  expect(virar).not.toHaveTextContent(card.pergunta);
});

it("edita e remove um card", async () => {
  mock.api.editarFlashcard.mockResolvedValue({ ...card, resposta: "Outra." });
  mock.api.excluirFlashcard.mockResolvedValue(null);
  render(<GerenciadorFlashcards aula={7} iniciais={[card]} />);

  await userEvent.click(screen.getByRole("button", { name: `Editar card: ${card.pergunta}` }));
  const verso = screen.getByLabelText("VERSO (RESPOSTA)");
  await userEvent.clear(verso);
  await userEvent.type(verso, "Outra.");
  await userEvent.click(screen.getByRole("button", { name: "SALVAR CARD" }));
  expect(mock.api.editarFlashcard).toHaveBeenCalledWith(1, {
    pergunta: card.pergunta,
    resposta: "Outra.",
  });

  await userEvent.click(
    await screen.findByRole("button", { name: `Excluir card: ${card.pergunta}` }),
  );
  expect(mock.api.excluirFlashcard).toHaveBeenCalledWith(1);
  expect(await screen.findByText("FLASHCARDS · 0")).toBeInTheDocument();
});
