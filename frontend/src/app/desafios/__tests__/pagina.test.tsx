import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  aula,
  exercicioResumo,
  trilhaDetalhe,
  trilhaResumo,
} from "@/components/__tests__/fixtures";
import { ErroApi } from "@/lib/api";
import { CHAVE, esquecerCache } from "@/lib/progresso";

import Erro from "../error";
import Carregando from "../loading";
import DesafiosPage from "../page";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    listarTrilhas: jest.fn(),
    buscarTrilha: jest.fn(),
    temSessao: jest.fn(() => false),
    api: { meusBonus: jest.fn() },
  };
});

const api = jest.requireMock<{
  listarTrilhas: jest.Mock;
  buscarTrilha: jest.Mock;
}>("@/lib/api");

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
  window.localStorage.clear();
  esquecerCache();
  api.listarTrilhas.mockResolvedValue([trilhaResumo()]);
  api.buscarTrilha.mockResolvedValue(TRILHA);
});

describe("Página de desafios", () => {
  it("mostra três desafios do dia", async () => {
    render(await DesafiosPage());

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("0 de 3 concluídos")).toBeInTheDocument();
  });

  it("cada desafio leva para a fase correspondente", async () => {
    render(await DesafiosPage());

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(
        /^\/trilhas\/logica-de-programacao\/exercicios\//,
      );
    }
  });

  it("não pede o detalhe de trilha sem fase publicada", async () => {
    api.listarTrilhas.mockResolvedValue([
      trilhaResumo(),
      trilhaResumo({ id: 2, slug: "python", nome: "Python", total_exercicios: 0 }),
    ]);

    render(await DesafiosPage());

    expect(api.buscarTrilha).toHaveBeenCalledTimes(1);
    expect(api.buscarTrilha).toHaveBeenCalledWith("logica-de-programacao");
  });

  it("conta o que o aluno já concluiu no navegador", async () => {
    render(await DesafiosPage());
    const primeiro = screen.getAllByRole("link")[0]!;
    const slug = primeiro.getAttribute("href")!.split("/").at(-1)!;

    window.localStorage.setItem(
      CHAVE,
      JSON.stringify({ "logica-de-programacao": [slug] }),
    );
    esquecerCache();

    render(await DesafiosPage());
    expect(screen.getAllByText("1 de 3 concluídos").length).toBeGreaterThan(0);
  });

  it("sem fase publicada, explica em vez de mostrar lista vazia", async () => {
    api.listarTrilhas.mockResolvedValue([]);

    render(await DesafiosPage());

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
