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