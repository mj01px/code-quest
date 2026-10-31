import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuizQuestao } from "@/components/trilhas/QuizQuestao";

const questao = {
  id: 1,
  enunciado: "Qual imprime na tela?",
  opcoes: ["print", "input", "len", "int"],
  resposta_correta: "A" as const,
};

function opcao(texto: string) {
  return screen.getByRole("button", { name: new RegExp(texto) });
}

describe("QuizQuestao", () => {
  it("acerto marca a opção de verde e trava as outras", async () => {
    render(<QuizQuestao questao={questao} />);

    await userEvent.click(opcao("print"));

    expect(screen.getByRole("status")).toHaveTextContent("CORRETO");
    expect(opcao("print")).toHaveClass("border-success");
    expect(opcao("len")).toBeDisabled();
  });

  it("erro marca a escolhida de vermelho e mostra a certa", async () => {
    render(<QuizQuestao questao={questao} />);

    await userEvent.click(opcao("len"));

    expect(screen.getByRole("status")).toHaveTextContent("A CERTA É A");
    expect(opcao("len")).toHaveClass("border-danger");
    expect(opcao("print")).toHaveClass("border-success");
  });
});
