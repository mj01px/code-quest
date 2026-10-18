import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  aula,
  exercicioDetalhe,
  exercicioResumo,
  minhaCriatura,
  progressoAtual,
  trilhaDetalhe,
  trilhaResumo,
  usuario,
} from "@/components/__tests__/fixtures";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi } from "@/lib/api";
import type { ExercicioConcluido } from "@/lib/types";

import Erro from "../error";
import Carregando from "../loading";
import DesafiosPage from "../page";

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
      trilhasIniciadas: jest.fn(),
      eu: jest.fn(),
      minhasCriaturas: jest.fn(),
      meuProgresso: jest.fn(),
      minhaSequencia: jest.fn(),
    },
  };
});

const api = jest.requireMock<{
  listarTrilhas: jest.Mock;
  buscarTrilha: jest.Mock;
  buscarExercicio: jest.Mock;
  temSessao: jest.Mock;
  api: {
    meusBonus: jest.Mock;
    exerciciosConcluidos: jest.Mock;
    trilhasIniciadas: jest.Mock;
    eu: jest.Mock;
    minhasCriaturas: jest.Mock;
    meuProgresso: jest.Mock;
    minhaSequencia: jest.Mock;
  };
}>("@/lib/api");

// A página é Server Component e o provedor mora no layout do route group; o
// teste monta a mesma moldura para que as ilhas de dentro achem o Context.
async function montar(no: React.ReactNode) {
  const r = render(<ProvedorProgresso>{no}</ProvedorProgresso>);
  await waitFor(() => expect(api.api.exerciciosConcluidos).toHaveBeenCalled());
  return r;
}

/** O progresso vem da API agora; antes esta tela lia `localStorage`. */
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

const TRILHA = trilhaDetalhe({
  aulas: [
    aula({
      id: 1,
      titulo: "Variáveis e tipos",
      slug: "variaveis",
      exercicios: [
        exercicioResumo({ id: 1, titulo: "Média", slug: "media" }),
        exercicioResumo({ id: 2, titulo: "Trocar", slug: "trocar" }),
      ],
    }),
    aula({
      id: 2,
      titulo: "Condicionais",
      slug: "condicionais",
      exercicios: [
        exercicioResumo({ id: 3, titulo: "Par ou ímpar", slug: "par-ou-impar" }),
        exercicioResumo({ id: 4, titulo: "Maior de três", slug: "maior-de-tres" }),
      ],
    }),
    aula({
      id: 3,
      titulo: "Repetição",
      slug: "repeticao",
      exercicios: [
        exercicioResumo({ id: 5, titulo: "Tabuada", slug: "tabuada" }),
        exercicioResumo({ id: 6, titulo: "Fatorial", slug: "fatorial" }),
      ],
    }),
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  api.temSessao.mockReturnValue(true);
  api.api.eu.mockResolvedValue(usuario());
  api.api.minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  api.api.meuProgresso.mockResolvedValue(progressoAtual());
  api.api.minhaSequencia.mockResolvedValue({
    atual: 0,
    recorde: 0,
    feito_hoje: false,
    ultimo_dia: null,
  });
  concluiu("nenhuma");
  api.listarTrilhas.mockResolvedValue([trilhaResumo()]);
  api.buscarTrilha.mockResolvedValue(TRILHA);
  api.buscarExercicio.mockImplementation(async (_trilha: string, slug: string) =>
    exercicioDetalhe({ slug, enunciado: `Enunciado da fase ${slug}.` }),
  );
});

describe("Página de desafios", () => {
  it("mostra três desafios do dia", async () => {
    await montar(await DesafiosPage());

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("0 de 3 concluídos")).toBeInTheDocument();
  });

  it("cada desafio leva para a fase correspondente", async () => {
    await montar(await DesafiosPage());

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(
        /^\/trilhas\/logica-de-programacao\/exercicios\//,
      );
    }
  });

  it("mostra a sequência de quem está logado, entre o resumo e a lista", async () => {
    await montar(await DesafiosPage());

    expect(
      await screen.findByRole("heading", { name: "Sua sequência" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });

  it("cada botão tem nome acessível próprio e área de toque de 44px", async () => {
    await montar(await DesafiosPage());

    const botoes = screen.getAllByRole("link", { name: /^Encarar desafio: / });
    expect(botoes).toHaveLength(3);
    expect(new Set(botoes.map((botao) => botao.getAttribute("aria-label"))).size).toBe(3);
    for (const botao of botoes) expect(botao).toHaveClass("min-h-11");
  });

  it("mostra o começo do enunciado, com link para a fase completa", async () => {
    await montar(await DesafiosPage());

    const previews = screen.getAllByText(/^Enunciado da fase /);
    expect(previews).toHaveLength(3);
    for (const preview of previews) expect(preview).toHaveClass("line-clamp-3");

    const verMais = screen.getAllByRole("link", { name: /^Ver enunciado completo: / });
    expect(verMais).toHaveLength(3);
    for (const link of verMais) {
      expect(link.getAttribute("href")).toMatch(
        /^\/trilhas\/logica-de-programacao\/exercicios\//,
      );
    }
  });

  it("sem o detalhe da fase, o cartão aparece sem preview", async () => {
    api.buscarExercicio.mockRejectedValue(
      new ErroApi(0, "sem_conexao", "Servidor fora do ar."),
    );

    await montar(await DesafiosPage());

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText(/^Enunciado da fase /)).not.toBeInTheDocument();
  });

  it("não pede o detalhe de trilha sem fase publicada", async () => {
    api.listarTrilhas.mockResolvedValue([
      trilhaResumo(),
      trilhaResumo({ id: 2, slug: "python", nome: "Python", total_exercicios: 0 }),
    ]);

    await montar(await DesafiosPage());

    expect(api.buscarTrilha).toHaveBeenCalledTimes(1);
    expect(api.buscarTrilha).toHaveBeenCalledWith("logica-de-programacao");
  });

  it("conta o que o aluno já concluiu, lendo da conta", async () => {
    const { unmount } = await montar(await DesafiosPage());
    const primeiro = screen.getAllByRole("link")[0]!;
    const slug = primeiro.getAttribute("href")!.split("/").at(-1)!;
    unmount();

    concluiu("logica-de-programacao", slug);

    await montar(await DesafiosPage());
    expect(await screen.findByText("1 de 3 concluídos")).toBeInTheDocument();
  });

  it("sem fase publicada, explica em vez de mostrar lista vazia", async () => {
    api.listarTrilhas.mockResolvedValue([]);

    await montar(await DesafiosPage());

    expect(
      screen.getByText(/Ainda não há fases publicadas/),
    ).toBeInTheDocument();
  });

  it("deixa o erro da API subir para o error.tsx da rota", async () => {
    api.listarTrilhas.mockRejectedValue(
      new ErroApi(0, "sem_conexao", "Servidor fora do ar."),
    );

    await expect(DesafiosPage()).rejects.toBeInstanceOf(ErroApi);
  });

  it("a tela de erro oferece tentar de novo", async () => {
    const reset = jest.fn();
    render(<Erro error={new Error("falhou")} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /tentar de novo/i }));
    expect(reset).toHaveBeenCalled();
  });

  it("a tela de carregamento avisa quem usa leitor de tela", () => {
    const { container } = render(<Carregando />);
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
  });
});
