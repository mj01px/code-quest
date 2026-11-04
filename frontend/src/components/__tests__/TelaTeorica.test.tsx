import { fireEvent, render, screen, within } from "@testing-library/react";

import { TelaTeorica } from "@/components/exercicio/TelaTeorica";

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

function montar() {
  return render(
    <TelaTeorica
      trilhaSlug="logica"
      exercicioSlug="tipo-do-resultado"
      cabecalho="Lógica de Programação · Módulo 01"
      titulo="Qual é o tipo do resultado?"
      enunciado="Em Python, qual é o tipo do resultado de `10 / 2`?"
      xp={50}
      contexto="Todo valor tem um **tipo**."
      exemplo={"print(type(3))  # int"}
      licaoHref="/trilhas/logica/aulas/variaveis"
      pet={<span>pet</span>}
    />,
  );
}

beforeEach(() => {
  chaves = new Set();
  mockRecarregar.mockReset();
  mockConcluir.mockReset().mockResolvedValue({
    aprovado: true,
    correcao: null,
    ja_concluido: false,
    xp_ganho: 50,
    sequencia: { aumentou: true },
    explicacao: "É `float`: o operador `/` sempre devolve float.",
  });
});

describe("TelaTeorica", () => {
  it("mostra a pergunta, o relembrar da lição e conta os caracteres", () => {
    montar();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Qual é o tipo do resultado?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Resposta escrita")).toBeInTheDocument();
    expect(screen.getByText("+50 XP")).toBeInTheDocument();
    expect(screen.getByText("Relembrar da lição")).toBeInTheDocument();
    expect(screen.getByText(/print\(type\(3\)\)/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("SUA RESPOSTA"), {
      target: { value: "É float" },
    });
    expect(screen.getByText(/7 caracteres · mínimo 10/)).toBeInTheDocument();
  });

  it("não envia resposta curta", () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));

    expect(mockConcluir).not.toHaveBeenCalled();
  });

  it("depois de enviar compara a resposta do aluno com a de referência", async () => {
    montar();

    fireEvent.change(screen.getByLabelText("SUA RESPOSTA"), {
      target: { value: "É float porque a divisão sempre devolve float." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));

    const referencia = await screen.findByRole("region", {
      name: "Resposta de referência",
    });
    expect(
      within(referencia).getByText(/sempre devolve float/),
    ).toBeInTheDocument();
    const sua = screen.getByRole("region", { name: "Sua resposta" });
    expect(
      within(sua).getByText("É float porque a divisão sempre devolve float."),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("+50 XP · +1 dia");
    expect(screen.getByRole("link", { name: "Reler a lição" })).toHaveAttribute(
      "href",
      "/trilhas/logica/aulas/variaveis",
    );
    expect(mockConcluir).toHaveBeenCalledWith("logica", "tipo-do-resultado");
    expect(mockRecarregar).toHaveBeenCalled();
  });

  it("quem já concluiu revê a referência sem escrever de novo", async () => {
    chaves = new Set(["logica/tipo-do-resultado"]);
    mockConcluir.mockResolvedValue({
      aprovado: true,
      correcao: null,
      ja_concluido: true,
      xp_ganho: 0,
      sequencia: { aumentou: false },
      explicacao: "É float.",
    });
    montar();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver resposta de referência" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Concluído");
    expect(
      screen.getByText("Você não escreveu nada desta vez."),
    ).toBeInTheDocument();
  });
});
