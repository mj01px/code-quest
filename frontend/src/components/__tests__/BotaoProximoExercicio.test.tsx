import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { BotaoProximoExercicio } from "@/components/trilhas/BotaoProximoExercicio";
import { api as apiReal, temSessao as temSessaoReal } from "@/lib/api";
import type { ExercicioConcluido } from "@/lib/types";

import { minhaCriatura, progressoAtual, usuario } from "./fixtures";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    temSessao: jest.fn(),
    api: {
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
const eu = apiReal.eu as jest.MockedFunction<typeof apiReal.eu>;
const minhasCriaturas = apiReal.minhasCriaturas as jest.MockedFunction<
  typeof apiReal.minhasCriaturas
>;
const meuProgresso = apiReal.meuProgresso as jest.MockedFunction<
  typeof apiReal.meuProgresso
>;
const trilhasIniciadas = apiReal.trilhasIniciadas as jest.MockedFunction<
  typeof apiReal.trilhasIniciadas
>;

function conclusao(exercicio_slug: string): ExercicioConcluido {
  return {
    trilha_slug: "logica",
    exercicio_slug,
    xp: 50,
    criado_em: "2026-09-12T12:00:00Z",
  };
}

function montar(proximoSlug: string | null = "trocar") {
  return render(
    <ProvedorProgresso>
      <BotaoProximoExercicio
        trilhaSlug="logica"
        exercicioSlug="media"
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

describe("BotaoProximoExercicio", () => {
  it("aparece desabilitado antes de concluir", async () => {
    montar();
    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());

    expect(bloqueado()).toHaveAttribute("aria-disabled", "true");
    expect(bloqueado()).not.toHaveAttribute("href");
    expect(
      screen.queryByRole("link", { name: /próximo exercício/i }),
    ).not.toBeInTheDocument();
  });

  it("fica desabilitado sem sessão", async () => {
    temSessao.mockReturnValue(false);
    montar();

    await waitFor(() => expect(bloqueado()).toBeInTheDocument());
    expect(bloqueado()).not.toHaveAttribute("href");
  });

  it("leva ao próximo exercício quando já estava concluído", async () => {
    exerciciosConcluidos.mockResolvedValue([conclusao("media")]);
    montar();

    const link = await screen.findByRole("link", {
      name: /próximo exercício/i,
    });
    expect(link).toHaveAttribute("href", "/trilhas/logica/exercicios/trocar");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("vira Voltar para a trilha no último exercício", async () => {
    exerciciosConcluidos.mockResolvedValue([conclusao("media")]);
    montar(null);

    const link = await screen.findByRole("link", {
      name: /voltar para a trilha/i,
    });
    expect(link).toHaveAttribute("href", "/trilhas/logica");
    expect(
      screen.queryByRole("link", { name: /próximo exercício/i }),
    ).not.toBeInTheDocument();
  });

  it("não usa a conclusão de outro exercício da mesma trilha", async () => {
    exerciciosConcluidos.mockResolvedValue([conclusao("trocar")]);
    montar();
    await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());

    expect(bloqueado()).not.toHaveAttribute("href");
  });

  it("habilita depois que o aluno conclui na mesma tela", async () => {
    concluirExercicio.mockResolvedValue({
      ja_concluido: false,
      xp_ganho: 50,
      subiu_de_nivel: false,
      pode_evoluir: false,
      progresso: progressoAtual(),
    });
    // Primeira leitura: nada feito. A releitura do recarregar() já traz a fase.
    exerciciosConcluidos
      .mockResolvedValueOnce([])
      .mockResolvedValue([conclusao("media")]);

    render(
      <ProvedorProgresso>
        <BotaoConclusao trilhaSlug="logica" faseSlug="media" />
        <BotaoProximoExercicio
          trilhaSlug="logica"
          exercicioSlug="media"
          proximoSlug="trocar"
        />
      </ProvedorProgresso>,
    );
    const concluir = screen.getByRole("button");
    await waitFor(() =>
      expect(concluir).toHaveAttribute("aria-busy", "false"),
    );
    expect(bloqueado()).not.toHaveAttribute("href");

    await userEvent.click(concluir);

    const link = await screen.findByRole("link", {
      name: /próximo exercício/i,
    });
    expect(link).toHaveAttribute("href", "/trilhas/logica/exercicios/trocar");
  });
});
