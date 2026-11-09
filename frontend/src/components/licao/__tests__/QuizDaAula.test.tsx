import { fireEvent, render, screen } from "@testing-library/react";

import { QuizDaAula } from "@/components/licao/QuizDaAula";
import type { Questao } from "@/lib/types";

const mockConcluirQuiz = jest.fn();
const mockRecarregar = jest.fn();

jest.mock("@/lib/api", () => ({
  api: { concluirQuiz: (...args: unknown[]) => mockConcluirQuiz(...args) },
  temSessao: () => true,
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ recarregar: mockRecarregar }),
}));

beforeEach(() => {
  mockConcluirQuiz.mockReset().mockResolvedValue({});
  mockRecarregar.mockReset();
});

const QUESTOES: Questao[] = [
  { id: 1, enunciado: "Quanto é `4 + 3`?", opcoes: ["3", "4", "7", "43"], resposta_correta: "C" },
  { id: 2, enunciado: "Tipo de `10 / 2`?", opcoes: ["int", "str", "bool", "float"], resposta_correta: "D" },
];

function montar() {
  render(
    <QuizDaAula
      trilhaSlug="t"
      aulaSlug="a"
      aulaTitulo="Variáveis"
      questoes={QUESTOES}
      rotaDaLicao="/trilhas/t/aulas/a"
      rotaDosExercicios="/trilhas/t/exercicios/e"
    />,
  );
}

function alternativa(texto: string) {
  return screen.getByRole("button", { name: new RegExp(`^[A-D]\\s*${texto}$`) });
}

describe("QuizDaAula", () => {
  it("usa a barra de foco com saída para a lição e o placar", () => {
    montar();

    expect(screen.getByRole("link", { name: "< Sair" })).toHaveAttribute("href", "/trilhas/t/aulas/a");
    expect(screen.getByText("0 / 2 acertos")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quiz" })).toBeInTheDocument();
    expect(screen.getByText("Módulo: Variáveis")).toBeInTheDocument();
  });

  it("só confirma depois de escolher", () => {
    montar();

    expect(screen.getByText("Pergunta 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();

    fireEvent.click(alternativa("7"));
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("conta o acerto e mostra a resposta certa quando erra", () => {
    montar();

    fireEvent.click(alternativa("7"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText("> correto!")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 acertos")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    fireEvent.click(alternativa("int"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText("> errado. a certa é D.")).toBeInTheDocument();
  });

  it("fecha com o resultado, registra no servidor e permite refazer", async () => {
    montar();

    fireEvent.click(alternativa("7"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    fireEvent.click(alternativa("float"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));

    expect(screen.getByText("Quiz concluído")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 de 2");
    expect(screen.getByText(/Gabaritou/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para os exercícios" })).toHaveAttribute(
      "href",
      "/trilhas/t/exercicios/e",
    );

    expect(mockConcluirQuiz).toHaveBeenCalledWith("t", "a", { 1: "C", 2: "D" });
    expect(await screen.findByText("Quiz registrado no seu progresso")).toBeInTheDocument();
    expect(mockRecarregar).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Refazer quiz" }));
    expect(screen.getByText("Pergunta 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("0 / 2 acertos")).toBeInTheDocument();
  });
});
