import { fireEvent, render, screen } from "@testing-library/react";

import { SessaoFlashcards, type CardDaSessao } from "@/components/licao/SessaoFlashcards";

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ criatura: null }),
}));

const CARDS: CardDaSessao[] = [
  {
    id: 1,
    pergunta: "O que faz o `=`?",
    resposta: "Guarda o valor.",
    dica: "Qual lado vem primeiro?",
    baralho: "Variáveis",
  },
  { id: 2, pergunta: "O que é `//`?", resposta: "Divisão inteira.", baralho: "Variáveis" },
];

function montar() {
  render(<SessaoFlashcards cards={CARDS} rotaDaTrilha="/trilhas/t" />);
}

describe("SessaoFlashcards", () => {
  it("revela a resposta no clique e na barra de espaço", () => {
    montar();

    expect(screen.getByText("Card 1 de 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revelar a resposta" }));
    expect(screen.getByText("Guarda o valor.")).toBeInTheDocument();

    fireEvent.keyDown(window, { code: "Space" });
    expect(screen.getByRole("button", { name: "Revelar a resposta" })).toBeInTheDocument();
  });

  it("conta sabia e revisar e oferece revisar só os marcados", () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Revelar a resposta" }));
    fireEvent.click(screen.getByRole("button", { name: "Sabia" }));
    fireEvent.click(screen.getByRole("button", { name: "Revelar a resposta" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(screen.getByText("Baralho concluído")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 de 2");
    expect(screen.getByText(/Revise o que ficou para trás/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revisar 1" }));
    expect(screen.getByText("Card 1 de 1")).toBeInTheDocument();
    expect(screen.getByText("O que é")).toBeInTheDocument();
  });

  it("parabeniza quando sabia todos e não oferece revisão", () => {
    montar();

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Revelar a resposta" }));
      fireEvent.click(screen.getByRole("button", { name: "Sabia" }));
    }

    expect(screen.getByRole("status")).toHaveTextContent("2 de 2");
    expect(screen.getByText(/Você sabia todos/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Revisar/ })).not.toBeInTheDocument();
  });

  it("mostra a barra de foco com título e saída para a trilha", () => {
    montar();

    expect(screen.getByRole("heading", { name: "Flashcards" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "< Sair" })).toHaveAttribute("href", "/trilhas/t");
  });

  it("o pet dá a dica do card e fecha ao trocar de card", () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: /Pedir uma dica/ }));
    expect(screen.getByText("Qual lado vem primeiro?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pular card >" }));
    expect(screen.queryByText("Qual lado vem primeiro?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pedir uma dica/ }));
    expect(screen.getByText(/Lembra da lição de Variáveis/)).toBeInTheDocument();
  });

  it("pular manda o card para o fim e não deixa terminar sem responder", () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Pular card >" }));
    expect(screen.getByText("Card 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("O que é")).toBeInTheDocument();
    expect(screen.getByText("0 sabia · 0 revisar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revelar a resposta" }));
    fireEvent.click(screen.getByRole("button", { name: "Sabia" }));

    expect(screen.getByText("Card 2 de 2")).toBeInTheDocument();
    expect(screen.getByText("O que faz o")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pular card >" })).not.toBeInTheDocument();
  });
});
