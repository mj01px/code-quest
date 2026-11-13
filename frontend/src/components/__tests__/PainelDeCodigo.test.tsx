import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { api } from "@/lib/api";
import type { Correcao, EspecificacaoDeCodigo } from "@/lib/types";

jest.mock("@/components/exercicio/EditorDeCodigo", () => ({
  EditorDeCodigo: ({
    valor,
    aoMudar,
  }: {
    valor: string;
    aoMudar: (valor: string) => void;
  }) => (
    <textarea
      aria-label="Código"
      value={valor}
      onChange={(evento) => aoMudar(evento.target.value)}
    />
  ),
}));

jest.mock("@/components/exercicio/TerminalDeSaida", () => ({
  TerminalDeSaida: ({
    saida,
    erro,
    veredito,
  }: {
    saida: string;
    erro: string;
    veredito: string;
  }) => (
    <div data-testid="terminal">
      <span>{saida}</span>
      <span>{erro}</span>
      <span>{veredito}</span>
    </div>
  ),
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ chaves: new Set<string>(), recarregar: jest.fn() }),
}));

jest.mock("@/lib/api", () => ({
  ErroApi: class ErroApi extends Error {},
  api: {
    executarCodigo: jest.fn(),
    concluirExercicio: jest.fn(),
  },
}));

const executarCodigo = api.executarCodigo as jest.MockedFunction<
  typeof api.executarCodigo
>;
const concluirExercicio = api.concluirExercicio as jest.MockedFunction<
  typeof api.concluirExercicio
>;

const especificacao: EspecificacaoDeCodigo = {
  linguagem: "PYTHON",
  funcao: "soma",
  codigo_inicial: "def soma(a, b):\n    return a + b",
  requisitos: [],
  limite_de_caracteres: 10_000,
  codigo_aprovado: "",
  exemplos: [],
};

function correcao(dados: Partial<Correcao> = {}): Correcao {
  return {
    modo: "EXECUTAR",
    veredito: "APROVADO",
    aprovado: true,
    aprovados: 1,
    total: 1,
    casos: [],
    saida: "",
    erro: "",
    tempo: 0.1,
    memoria: 1024,
    ...dados,
  };
}

function montar() {
  return render(
    <PainelDeCodigo
      trilhaSlug="python"
      exercicioSlug="soma"
      especificacao={especificacao}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PainelDeCodigo", () => {
  it("mostra o resultado dos casos visíveis de SQL e oculta os detalhes privados", async () => {
    const visivel = { ordem: 1, visivel: true, passou: true, descricao: "Aceita a nota 0" };
    executarCodigo.mockResolvedValue(correcao({ casos: [visivel] }));
    concluirExercicio.mockResolvedValue({
      aprovado: false,
      correcao: correcao({
        modo: "ENVIAR",
        aprovado: false,
        veredito: "RESPOSTA_ERRADA",
        total: 2,
        casos: [visivel, { ordem: 2, visivel: false, passou: false }],
      }),
    });

    render(
      <PainelDeCodigo
        trilhaSlug="banco-de-dados"
        exercicioSlug="restringir-nota"
        aprender={<div>Lição</div>}
        especificacao={{
          ...especificacao,
          linguagem: "SQL",
          funcao: "",
          codigo_inicial: "nota NUMERIC CHECK (nota BETWEEN 0 AND 10)",
          exemplos: [{ ordem: 1, descricao: "Aceita a nota 0" }],
        }}
      />,
    );

    expect(screen.getByText("exercicio.sql")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resultado SQL" })).toBeInTheDocument();
    expect(screen.getByText("Aceita a nota 0")).toBeInTheDocument();
    const terminal = await screen.findByTestId("terminal");
    await userEvent.click(screen.getByRole("button", { name: "Rodar" }));
    expect(await screen.findByText("Passou em todos os casos")).toBeInTheDocument();
    expect(screen.getByText("1 de 1 caso aprovado")).toBeInTheDocument();
    expect(screen.getByText("Aceita a nota 0")).toBeInTheDocument();
    expect(screen.getByTestId("terminal")).toBe(terminal);
    expect(terminal).toHaveTextContent("Comando SQL executado.");
    expect(screen.queryByText(/Caso oculto/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText(/Caso oculto 2/)).toBeInTheDocument();
    expect(screen.getByText("1 de 2 casos aprovados")).toBeInTheDocument();
    expect(screen.getByTestId("terminal")).toBe(terminal);
    expect(terminal).toHaveTextContent("Envio SQL processado.");
  });

  it("mostra as entradas personalizadas no Rodar e usa o resultado oficial no Enviar", async () => {
    const codigo = "nota1 = 10\nnota2 = 8\ndef media(nota1, nota2):\n    return 9\n";
    executarCodigo.mockResolvedValue(correcao({
      personalizado: true,
      casos: [{ ordem: 1, visivel: true, passou: true, argumentos: [10, 8], obtido: 9 }],
    }));
    concluirExercicio.mockResolvedValue({
      aprovado: false,
      correcao: correcao({
        personalizado: false,
        modo: "ENVIAR",
        aprovado: false,
        veredito: "RESPOSTA_ERRADA",
        casos: [{ ordem: 1, visivel: true, passou: false, argumentos: [8, 6], esperado: 7, obtido: 9 }],
      }),
    });
    render(<PainelDeCodigo
      trilhaSlug="logica-de-programacao"
      exercicioSlug="media-de-duas-notas"
      especificacao={{
        ...especificacao,
        funcao: "media",
        parametros: ["nota1", "nota2"],
        codigo_inicial: codigo,
        exemplos: [{ ordem: 1, argumentos: [8, 6], esperado: 7, erro_esperado: "" }],
      }}
    />);

    expect(screen.getByLabelText("Entrada do exemplo").textContent).toBe("nota1 = 8\nnota2 = 6");
    await userEvent.click(screen.getByRole("button", { name: "Executar" }));
    expect(await screen.findByTestId("terminal")).toHaveTextContent("media(10, 8) → 9");
    expect(screen.getByLabelText("Entrada do exemplo").textContent).toBe("nota1 = 10\nnota2 = 8");
    expect(screen.getByText(/Execução concluída com suas entradas/)).toBeInTheDocument();
    expect(screen.queryByText("Passou em todos os casos")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Alguns casos falharam")).toBeInTheDocument();
    expect(concluirExercicio).toHaveBeenCalledWith("logica-de-programacao", "media-de-duas-notas", codigo);
    expect(screen.getByLabelText("Entrada do exemplo").textContent).toBe("nota1 = 8\nnota2 = 6");
  });

  it.each([false, true])("mostra as entradas fixas fora do código editável (modo foco: %s)", (foco) => {
    render(
      <PainelDeCodigo
        trilhaSlug="logica-de-programacao"
        exercicioSlug="media-de-duas-notas"
        aprender={foco ? <div>Lição</div> : undefined}
        especificacao={{
          ...especificacao,
          funcao: "media",
          parametros: ["nota1", "nota2"],
          codigo_inicial: "def media(nota1, nota2):\n    ...",
          exemplos: [
            { ordem: 1, argumentos: [8, 6], esperado: 7, erro_esperado: "" },
            { ordem: 2, argumentos: [10, 10], esperado: 10, erro_esperado: "" },
          ],
        }}
      />,
    );

    const entrada = screen.getByLabelText("Entrada do exemplo");
    expect(entrada.tagName).toBe("PRE");
    expect(entrada).not.toHaveAttribute("contenteditable");
    expect(entrada.textContent).toBe("nota1 = 8\nnota2 = 6");
    const editor = screen.getByRole("textbox", { name: "Código" });
    expect(editor).toHaveValue("def media(nota1, nota2):\n    ...");
    fireEvent.change(editor, { target: { value: "def media(nota1, nota2):\n    return (nota1 + nota2) / 2" } });
    expect(entrada.textContent).toBe("nota1 = 8\nnota2 = 6");
  });

  it("executa o desafio na trilha interna e mostra o retorno no terminal", async () => {
    const codigo = "def palindromo(texto):\n    return True";
    executarCodigo.mockResolvedValue(
      correcao({
        casos: [
          {
            ordem: 1,
            visivel: true,
            passou: true,
            argumentos: ["Ame a ema"],
            esperado: true,
            obtido: true,
          },
        ],
      }),
    );
    render(
      <PainelDeCodigo
        trilhaSlug="desafios-do-dia"
        exercicioSlug="palindromo"
        especificacao={{
          ...especificacao,
          funcao: "palindromo",
          codigo_inicial: codigo,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Executar" }));

    expect(executarCodigo).toHaveBeenCalledWith(
      "desafios-do-dia",
      "palindromo",
      codigo,
    );
    expect(await screen.findByTestId("terminal")).toHaveTextContent(
      'palindromo("Ame a ema") → True',
    );
    expect(concluirExercicio).not.toHaveBeenCalled();
  });

  it("mostra stdout e substitui a saída ao executar novamente", async () => {
    executarCodigo
      .mockResolvedValueOnce(correcao({ saida: "primeiro" }))
      .mockResolvedValueOnce(correcao({ saida: "segundo" }));
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Executar" }));
    expect(await screen.findByTestId("terminal")).toHaveTextContent("primeiro");
    expect(screen.getByText("Passou em todos os casos")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Executar" }));
    await waitFor(() =>
      expect(screen.getByTestId("terminal")).toHaveTextContent("segundo"),
    );
    expect(screen.getByTestId("terminal")).not.toHaveTextContent("primeiro");
  });

  it("mostra apenas o primeiro retorno no terminal e mantém os demais casos na avaliação", async () => {
    executarCodigo.mockResolvedValue(
      correcao({
        casos: [
          {
            ordem: 1,
            visivel: true,
            passou: true,
            argumentos: [2, 3],
            esperado: 5,
            obtido: 5,
          },
          {
            ordem: 2,
            visivel: true,
            passou: true,
            argumentos: [8, 6],
            esperado: 14,
            obtido: 14,
          },
          { ordem: 3, visivel: false, passou: true },
        ],
      }),
    );
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Executar" }));

    expect(await screen.findByTestId("terminal")).toHaveTextContent(
      "soma(2, 3) → 5",
    );
    expect(screen.getByTestId("terminal")).not.toHaveTextContent(
      "Caso oculto",
    );
    expect(screen.getByTestId("terminal")).not.toHaveTextContent("soma(8, 6)");
    expect(screen.getByText("soma(8, 6)")).toBeInTheDocument();
  });

  it("mostra a impressão sem repetir o retorno da função", async () => {
    executarCodigo.mockResolvedValue(
      correcao({
        saida: "7\nfim",
        casos: [
          {
            ordem: 1,
            visivel: true,
            passou: true,
            argumentos: [8, 6],
            obtido: 7,
          },
        ],
      }),
    );
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Executar" }));
    expect(await screen.findByTestId("terminal")).toHaveTextContent("7 fim");
    expect(screen.getByTestId("terminal")).not.toHaveTextContent("→");
  });

  it("mostra stderr e remove o terminal ao editar", async () => {
    executarCodigo.mockResolvedValue(
      correcao({
        veredito: "ERRO_DE_EXECUCAO",
        aprovado: false,
        erro: "ZeroDivisionError",
      }),
    );
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Executar" }));
    expect(await screen.findByTestId("terminal")).toHaveTextContent(
      "ZeroDivisionError",
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Código" }), {
      target: { value: "def soma(a, b):\n    return 0" },
    });
    expect(screen.queryByTestId("terminal")).not.toBeInTheDocument();
    expect(screen.queryByText("O código não chegou a rodar")).not.toBeInTheDocument();
  });

  it("mostra o terminal para tempo esgotado mesmo sem saída", async () => {
    executarCodigo.mockResolvedValue(
      correcao({ veredito: "TEMPO_ESGOTADO", aprovado: false }),
    );
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Executar" }));
    expect(await screen.findByTestId("terminal")).toBeInTheDocument();
  });

  it("não mostra terminal no Enviar", async () => {
    concluirExercicio.mockResolvedValue({
      aprovado: false,
      correcao: correcao({
        modo: "ENVIAR",
        veredito: "ERRO_DE_EXECUCAO",
        aprovado: false,
      }),
    });
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("O código não chegou a rodar")).toBeInTheDocument();
    expect(screen.queryByTestId("terminal")).not.toBeInTheDocument();
  });
});
