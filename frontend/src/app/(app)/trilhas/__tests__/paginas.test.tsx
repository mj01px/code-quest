import { render, screen, waitFor } from "@testing-library/react";

import {
  aula,
  exercicioDetalhe,
  exercicioResumo,
  minhaCriatura,
  progressoAtual,
  trilhaResumo,
  usuario,
} from "@/components/__tests__/fixtures";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi } from "@/lib/api";
import type { ExercicioConcluido } from "@/lib/types";

import Erro from "../error";
import Carregando from "../loading";
import NaoEncontrado from "../not-found";
import TrilhasPage from "../page";
import TrilhaPage from "../[trilhaSlug]/page";
import ExercicioPage from "../[trilhaSlug]/exercicios/[exercicioSlug]/page";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    listarTrilhas: jest.fn(),
    buscarTrilha: jest.fn(),
    buscarExercicio: jest.fn(),
    temSessao: jest.fn(() => true),
    api: {
      meusBonus: jest.fn(),
      exerciciosConcluidos: jest.fn(),
      eu: jest.fn(),
      minhasCriaturas: jest.fn(),
      meuProgresso: jest.fn(),
    },
  };
});

// Troca notFound() por um erro reconhecível para poder afirmar o 404.
class Erro404 extends Error {}
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Erro404("notFound");
  },
}));

const api = jest.requireMock<{
  listarTrilhas: jest.Mock;
  buscarTrilha: jest.Mock;
  buscarExercicio: jest.Mock;
  temSessao: jest.Mock;
  api: {
    meusBonus: jest.Mock;
    exerciciosConcluidos: jest.Mock;
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
  };
}>("@/lib/api");

/** O progresso vem da API agora; antes estas telas liam `localStorage`. */
function concluiu(trilhaSlug: string, ...fases: string[]): void {
  api.api.exerciciosConcluidos.mockResolvedValue(
    fases.map(
      (slug): ExercicioConcluido => ({
        trilha_slug: trilhaSlug,
        exercicio_slug: slug,
        xp: 50,
        criado_em: "2026-09-10T12:00:00Z",
      }),
    ),
  );
}

const PARAMS_TRILHA = {
  params: Promise.resolve({ trilhaSlug: "logica" }),
  searchParams: Promise.resolve({}),
};
const PARAMS_EXERCICIO = {
  params: Promise.resolve({
    trilhaSlug: "logica",
    exercicioSlug: "contar-vogais",
  }),
  searchParams: Promise.resolve({}),
};

// As páginas são Server Components e o provedor mora no layout do route group;
// o teste monta a mesma moldura para que as ilhas de dentro achem o Context.
async function montar(no: React.ReactNode) {
  const r = render(<ProvedorProgresso>{no}</ProvedorProgresso>);
  await waitFor(() => expect(api.api.exerciciosConcluidos).toHaveBeenCalled());
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  api.temSessao.mockReturnValue(true);
  api.api.meusBonus.mockResolvedValue([]);
  api.api.eu.mockResolvedValue(usuario());
  api.api.minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  api.api.meuProgresso.mockResolvedValue(progressoAtual());
  concluiu("nenhuma");
});

describe("Listagem de trilhas", () => {
  it("renderiza um card por trilha", async () => {
    api.listarTrilhas.mockResolvedValue([
      trilhaResumo(),
      trilhaResumo({ id: 2, nome: "Python", slug: "python" }),
    ]);
    api.buscarTrilha.mockResolvedValue({ ...trilhaResumo(), aulas: [aula()] });

    await montar(await TrilhasPage());

    expect(
      screen.getByRole("heading", { level: 2, name: "Trilhas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 trilhas")).toBeInTheDocument();
    // Um link por trilha, mais o card em destaque no topo.
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("mostra estado vazio quando não há trilha publicada", async () => {
    api.listarTrilhas.mockResolvedValue([]);

    await montar(await TrilhasPage());

    expect(screen.getByText(/Nenhuma trilha publicada/)).toBeInTheDocument();
  });

  it("deixa a falha da API subir para o error boundary", async () => {
    api.listarTrilhas.mockRejectedValue(new ErroApi(503, "indisponivel", "fora do ar"));

    await expect(TrilhasPage()).rejects.toBeInstanceOf(ErroApi);
  });

  it("busca a trilha em destaque para saber onde o aluno parou", async () => {
    const trilha = trilhaResumo({ total_aulas: 1, total_exercicios: 2 });
    api.listarTrilhas.mockResolvedValue([trilha]);
    api.buscarTrilha.mockResolvedValue({
      ...trilha,
      aulas: [
        aula({
          exercicios: [
            exercicioResumo({ id: 1, slug: "media" }),
            exercicioResumo({ id: 2, slug: "trocar", titulo: "Trocar" }),
          ],
        }),
      ],
    });
    concluiu(trilha.slug, "media");

    await montar(await TrilhasPage());

    expect(api.buscarTrilha).toHaveBeenCalledWith(trilha.slug);
    expect(
      await screen.findByText("Continuar de onde parou"),
    ).toBeInTheDocument();
    expect(screen.getByText("Módulo 1 · Trocar")).toBeInTheDocument();
  });

  it("não busca destaque nenhum quando não há trilha publicada", async () => {
    api.listarTrilhas.mockResolvedValue([]);

    await montar(await TrilhasPage());

    expect(api.buscarTrilha).not.toHaveBeenCalled();
  });
});

describe("Detalhe da trilha", () => {
  it("renderiza o mapa de fases com os exercícios", async () => {
    api.buscarTrilha.mockResolvedValue({
      ...trilhaResumo(),
      aulas: [
        aula(),
        aula({
          id: 11,
          titulo: "Condicionais",
          slug: "condicionais",
          ordem: 2,
          pre_requisito: "variaveis-e-tipos",
          exercicios: [
            exercicioResumo({ id: 2, titulo: "Par ou ímpar", slug: "par" }),
          ],
        }),
      ],
    });

    await montar(await TrilhaPage(PARAMS_TRILHA));

    expect(
      screen.getByRole("heading", { name: "Lógica de Programação" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mapa de fases")).toBeInTheDocument();
    // O título do módulo aparece no mapa de fases e em "Você vai dominar".
    expect(screen.getAllByText("Variáveis e tipos")).toHaveLength(2);
    expect(screen.getByText("Par ou ímpar")).toBeInTheDocument();
  });

  it("traduz o slug do pré-requisito para o título da fase", async () => {
    api.buscarTrilha.mockResolvedValue({
      ...trilhaResumo(),
      aulas: [
        aula(),
        aula({
          id: 11,
          titulo: "Condicionais",
          slug: "condicionais",
          ordem: 2,
          pre_requisito: "variaveis-e-tipos",
          exercicios: [],
        }),
      ],
    });

    await montar(await TrilhaPage(PARAMS_TRILHA));

    expect(
      screen.getByText(/requer Variáveis e tipos/),
    ).toBeInTheDocument();
  });

  it("pede 404 quando a trilha não está publicada", async () => {
    api.buscarTrilha.mockRejectedValue(new ErroApi(404, "nao_encontrado", "não encontrada"));

    await expect(TrilhaPage(PARAMS_TRILHA)).rejects.toBeInstanceOf(Erro404);
  });

  it("não confunde API fora do ar com conteúdo inexistente", async () => {
    api.buscarTrilha.mockRejectedValue(new ErroApi(503, "indisponivel", "fora do ar"));

    await expect(TrilhaPage(PARAMS_TRILHA)).rejects.toBeInstanceOf(ErroApi);
  });

  it("mostra aviso quando a trilha ainda não tem fases", async () => {
    api.buscarTrilha.mockResolvedValue({ ...trilhaResumo(), aulas: [] });

    await montar(await TrilhaPage(PARAMS_TRILHA));

    expect(screen.getByText(/ainda estão sendo escritas/)).toBeInTheDocument();
  });
});

describe("Detalhe do exercício", () => {
  it("mostra enunciado, dificuldade e tipo", async () => {
    api.buscarExercicio.mockResolvedValue(exercicioDetalhe());

    await montar(await ExercicioPage(PARAMS_EXERCICIO));

    expect(
      screen.getByRole("heading", { name: "Média de duas notas" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Escreva uma função/)).toBeInTheDocument();
    expect(screen.getByText("Iniciante")).toBeInTheDocument();
    expect(screen.getByText("Código")).toBeInTheDocument();
  });

  it("nunca mostra a solução do autor", async () => {
    // O backend não serializa o campo; se um dia serializar, isto acusa.
    api.buscarExercicio.mockResolvedValue(exercicioDetalhe());

    const { container } = await montar(await ExercicioPage(PARAMS_EXERCICIO));

    expect(container.textContent).not.toMatch(/solucao_autor/i);
  });

  it("pede 404 quando o exercício não existe", async () => {
    api.buscarExercicio.mockRejectedValue(new ErroApi(404, "nao_encontrado", "não encontrado"));

    await expect(ExercicioPage(PARAMS_EXERCICIO)).rejects.toBeInstanceOf(
      Erro404,
    );
  });
});

describe("Estados auxiliares", () => {
  it("o loading anuncia carregamento para leitores de tela", () => {
    const { container } = render(<Carregando />);

    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.getByText(/Carregando trilhas/)).toBeInTheDocument();
  });

  it("o error boundary mostra alerta e botão de nova tentativa", async () => {
    const reset = jest.fn();
    render(<Erro error={new Error("falhou")} reset={reset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: "Tentar de novo" }).click();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("o error boundary mostra o digest quando existe", () => {
    const erro = Object.assign(new Error("falhou"), { digest: "abc123" });
    render(<Erro error={erro} reset={jest.fn()} />);

    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });

  it("a página 404 explica e oferece volta para a listagem", () => {
    render(<NaoEncontrado />);

    expect(screen.getByText("Erro 404")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver todas as trilhas" }),
    ).toHaveAttribute("href", "/trilhas");
  });
});
