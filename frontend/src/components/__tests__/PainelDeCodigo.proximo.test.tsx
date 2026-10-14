import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { BotaoProximoExercicio } from "@/components/trilhas/BotaoProximoExercicio";
import { api as apiReal, temSessao as temSessaoReal } from "@/lib/api";
import type {
  Correcao,
  EspecificacaoDeCodigo,
  ExercicioConcluido,
} from "@/lib/types";

import { minhaCriatura, progressoAtual, usuario } from "./fixtures";

// Integração: o Enviar aprovado do PainelDeCodigo recarrega o Context real
// (ProvedorProgresso) e isso habilita o BotaoProximoExercicio. Só a rede e o
// Monaco/xterm são simulados.
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
  TerminalDeSaida: () => null,
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    temSessao: jest.fn(),
    api: {
      executarCodigo: jest.fn(),
      concluirExercicio: jest.fn(),
      exerciciosConcluidos: jest.fn(),
      trilhasIniciadas: jest.fn(),
      eu: jest.fn(),
      minhasCriaturas: jest.fn(),
      meuProgresso: jest.fn(),
    },
  };
});

const concluirExercicio = apiReal.concluirExercicio as jest.MockedFunction<
  typeof apiReal.concluirExercicio
>;
const exerciciosConcluidos =
  apiReal.exerciciosConcluidos as jest.MockedFunction<
    typeof apiReal.exerciciosConcluidos
  >;
const temSessao = temSessaoReal as jest.MockedFunction<typeof temSessaoReal>;
const trilhasIniciadas = apiReal.trilhasIniciadas as jest.MockedFunction<
  typeof apiReal.trilhasIniciadas
>;
const eu = apiReal.eu as jest.MockedFunction<typeof apiReal.eu>;
const minhasCriaturas = apiReal.minhasCriaturas as jest.MockedFunction<
  typeof apiReal.minhasCriaturas
>;
const meuProgresso = apiReal.meuProgresso as jest.MockedFunction<
  typeof apiReal.meuProgresso
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
    modo: "ENVIAR",
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

const conclusao: ExercicioConcluido = {
  trilha_slug: "python",
  exercicio_slug: "soma",
  xp: 50,
  criado_em: "2026-09-12T12:00:00Z",
};

function montar(proximoSlug: string | null = "media") {
  return render(
    <ProvedorProgresso>
      <PainelDeCodigo
        trilhaSlug="python"
        exercicioSlug="soma"
        especificacao={especificacao}
      />
      <BotaoProximoExercicio
        trilhaSlug="python"
        exercicioSlug="soma"
        proximoSlug={proximoSlug}
      />
    </ProvedorProgresso>,
  );
}

const bloqueado = () =>
  screen.getByRole("link", { name: "Conclua para avançar" });

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  exerciciosConcluidos.mockResolvedValue([]);
  trilhasIniciadas.mockResolvedValue([]);
  eu.mockResolvedValue(usuario());
  minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  meuProgresso.mockResolvedValue(progressoAtual());
});

describe("PainelDeCodigo habilita BotaoProximoExercicio", () => {
  it("aprovação no Enviar leva ao próximo exercício", async () => {
    concluirExercicio.mockResolvedValue({
      aprovado: true,
      correcao: correcao(),
      ja_concluido: false,
      xp_ganho: 50,
      subiu_de_nivel: false,
      pode_evoluir: false,
      progresso: progressoAtual(),
    });
    // A releitura disparada pelo recarregar() já traz a conclusão.
    exerciciosConcluidos
      .mockResolvedValueOnce([])
      .mockResolvedValue([conclusao]);

    montar();
    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalledTimes(1));
    expect(bloqueado()).not.toHaveAttribute("href");

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    const link = await screen.findByRole("link", {
      name: /próximo exercício/i,
    });
    expect(link).toHaveAttribute("href", "/trilhas/python/exercicios/media");
  });

  it("reprovação no Enviar mantém o botão bloqueado", async () => {
    concluirExercicio.mockResolvedValue({
      aprovado: false,
      correcao: correcao({ veredito: "RESPOSTA_ERRADA", aprovado: false }),
    });

    montar();
    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(concluirExercicio).toHaveBeenCalledTimes(1));
    // Reprovado não recarrega o Context: segue uma única leitura.
    expect(exerciciosConcluidos).toHaveBeenCalledTimes(1);
    expect(bloqueado()).not.toHaveAttribute("href");
    expect(
      screen.queryByRole("link", { name: /próximo exercício/i }),
    ).not.toBeInTheDocument();
  });

  it("aprovação no último exercício leva de volta à trilha", async () => {
    concluirExercicio.mockResolvedValue({
      aprovado: true,
      correcao: correcao(),
      ja_concluido: false,
      xp_ganho: 50,
      subiu_de_nivel: false,
      pode_evoluir: false,
      progresso: progressoAtual(),
    });
    exerciciosConcluidos
      .mockResolvedValueOnce([])
      .mockResolvedValue([conclusao]);

    montar(null);
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    const link = await screen.findByRole("link", {
      name: /voltar para a trilha/i,
    });
    expect(link).toHaveAttribute("href", "/trilhas/python");
  });
});
