import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  aula,
  exercicioDetalhe,
  exercicioResumo,
  trilhaDetalhe,
} from "@/components/__tests__/fixtures";
import { ModalVisualizacao } from "@/components/autoria/ModalVisualizacao";
import type { EspecificacaoDeCodigo, ExercicioEditorial, ItemEditorial } from "@/lib/types";

// O Monaco não sobe no jsdom: um textarea faz o papel do editor.
jest.mock("@/components/exercicio/EditorDeCodigo", () => ({
  EditorDeCodigo: ({ valor }: { valor: string }) => (
    <textarea aria-label="Código" value={valor} readOnly />
  ),
}));

jest.mock("@/components/progresso/ProvedorProgresso", () => ({
  useProgresso: () => ({ chaves: new Set<string>(), recarregar: jest.fn() }),
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: {
    detalheEditorial: jest.fn(),
    executarCodigo: jest.fn(),
    concluirExercicio: jest.fn(),
  },
}));

const mock = jest.requireMock<{ api: Record<string, jest.Mock> }>("@/lib/api");

const especificacao: EspecificacaoDeCodigo = {
  linguagem: "PYTHON",
  funcao: "media",
  codigo_inicial: "def media(a, b):\n    pass",
  requisitos: [],
  limite_de_caracteres: 10_000,
  codigo_aprovado: "",
  exemplos: [],
};

function exercicioEditorial(extra: Partial<ExercicioEditorial> = {}): ExercicioEditorial {
  return {
    ...exercicioDetalhe(),
    codigo_inicial: especificacao.codigo_inicial,
    especificacao,
    testes: [{ argumentos: [8, 6], esperado: 7, visivel: true }],
    ...extra,
  };
}

const TEORICO = exercicioEditorial({
  id: 2,
  titulo: "O que é variável",
  tipo: "TEORICO",
  enunciado: "Explique com suas palavras.",
  codigo_inicial: null,
  especificacao: null,
  testes: null,
});

// Uma aula com os três tipos: código (id 1), teórico (id 2) e uma questão.
const TRILHA = trilhaDetalhe({
  aulas: [
    aula({
      exercicios: [
        exercicioResumo(),
        exercicioResumo({ id: 2, titulo: "O que é variável", tipo: "TEORICO" }),
      ],
      questoes: [
        {
          id: 6,
          enunciado: "Qual é primitivo?",
          opcoes: ["int", "list", "dict", "set"],
          resposta_correta: "A",
        },
      ],
    }),
  ],
});

function montar(item: Partial<ItemEditorial> = {}) {
  return render(
    <ModalVisualizacao
      item={{ id: 100, tipo: "trilhas", titulo: "Lógica", status_editorial: "RASCUNHO", ...item }}
      rotulo="PRÉVIA DA TRILHA"
      acoes={[]}
      ocupado={false}
      erro={null}
      onAgir={jest.fn()}
      onFechar={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mock.api.detalheEditorial.mockImplementation(async (tipo: string, id: number) => {
    if (tipo === "trilhas") return TRILHA;
    return id === 2 ? TEORICO : exercicioEditorial();
  });
});

describe("ModalVisualizacao", () => {
  it("a questão vira o quiz do aluno e responde ao clique", async () => {
    const u = userEvent.setup();
    montar();

    const quiz = await screen.findByText("Qual é primitivo?");
    const opcao = within(quiz.parentElement as HTMLElement).getByRole("button", { name: /int/ });
    await u.click(opcao);

    expect(await screen.findByRole("status")).toHaveTextContent("CORRETO!");
  });

  it("o exercício de código abre o painel do aluno, que executa mas não envia", async () => {
    const u = userEvent.setup();
    mock.api.executarCodigo.mockResolvedValue({
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
    });
    montar();

    // Fechado até o autor pedir: sem editor nem leitura do detalhe.
    const botao = await screen.findByRole("button", { name: /Média de duas notas/ });
    expect(screen.queryByLabelText("Código")).toBeNull();
    expect(mock.api.detalheEditorial).not.toHaveBeenCalledWith("exercicios", 1);
    await u.click(botao);

    expect(await screen.findByLabelText("Código")).toHaveValue(especificacao.codigo_inicial);
    expect(mock.api.detalheEditorial).toHaveBeenCalledWith("exercicios", 1);
    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Executar" }));

    expect(mock.api.executarCodigo).toHaveBeenCalledWith(
      "logica-de-programacao",
      "media-de-duas-notas",
      especificacao.codigo_inicial,
    );
    expect(mock.api.concluirExercicio).not.toHaveBeenCalled();
  });

  it("o teórico abre só o enunciado, sem editor", async () => {
    const u = userEvent.setup();
    montar();

    await u.click(await screen.findByRole("button", { name: /O que é variável/ }));

    expect(await screen.findByText("Explique com suas palavras.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Código")).toBeNull();
  });

  it("aberto direto num exercício de código, mostra o painel sem clique", async () => {
    montar({ id: 1, tipo: "exercicios", titulo: "Média de duas notas" });

    expect(await screen.findByLabelText("Código")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Executar" })).toBeInTheDocument();
  });
});
