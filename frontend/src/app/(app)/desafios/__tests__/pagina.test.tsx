import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  minhaCriatura,
  progressoAtual,
  usuario,
} from "@/components/__tests__/fixtures";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi } from "@/lib/api";
import type { DesafioApi, ExercicioConcluido } from "@/lib/types";

import Erro from "../error";
import Carregando from "../loading";
import DesafiosPage from "../page";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    buscarDesafioDeHoje: jest.fn(),
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
  buscarDesafioDeHoje: jest.Mock;
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

async function montar(no: React.ReactNode) {
  const r = render(<ProvedorProgresso>{no}</ProvedorProgresso>);
  await waitFor(() => expect(api.api.exerciciosConcluidos).toHaveBeenCalled());
  return r;
}

function concluiu(trilhaSlug: string, ...fases: string[]): void {
  api.api.exerciciosConcluidos.mockResolvedValue(
    fases.map((slug): ExercicioConcluido => ({
      trilha_slug: trilhaSlug,
      exercicio_slug: slug,
      xp: 100,
      criado_em: "2026-11-04T12:00:00Z",
    })),
  );
}

const DESAFIO: DesafioApi = {
  slug: "relogio-digital",
  titulo: "Relógio digital",
  enunciado: "Escreva `relogio(segundos)` que devolva HH:MM:SS.",
  tipo: "CODIGO",
  tipo_label: "Código",
  dificuldade: "INTERMEDIARIO",
  dificuldade_label: "Intermediário",
  trilha_slug: "desafios-do-dia",
};

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
  api.buscarDesafioDeHoje.mockResolvedValue({
    dia: "2026-11-04",
    desafio: DESAFIO,
    proximos: [
      { dia: "2026-11-05", slug: "palindromo", titulo: "É palíndromo?" },
      { dia: "2026-11-06", slug: "fizzbuzz", titulo: "FizzBuzz" },
      { dia: "2026-11-07", slug: "contar-vogais", titulo: "Contar vogais" },
      { dia: "2026-11-08", slug: "maior-sem-max", titulo: "O maior sem max()" },
    ],
  });
});

describe("Página de desafios", () => {
  it("mostra o desafio de hoje em destaque, escolhido pelo servidor", async () => {
    await montar(await DesafiosPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Relógio digital" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Python · Intermediário ·/)).toBeInTheDocument();
    expect(screen.getByText("+100 XP")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });

  it("o botão leva para a rota própria do desafio, fora das trilhas", async () => {
    await montar(await DesafiosPage());

    const botao = screen.getByRole("link", { name: "Encarar desafio ›" });
    expect(botao).toHaveAttribute("href", "/desafios/relogio-digital");
    expect(botao).toHaveClass("min-h-11");
  });

  it("mostra só o resumo do enunciado", async () => {
    await montar(await DesafiosPage());

    expect(screen.getByText(/HH:MM:SS/)).toBeInTheDocument();
  });

  it("lista os próximos dias do rodízio, sem a sequência", async () => {
    await montar(await DesafiosPage());

    const lista = screen.getByRole("list");
    expect(lista.children).toHaveLength(4);
    expect(screen.getByText("Amanhã")).toBeInTheDocument();
    expect(screen.getByText("Sexta")).toBeInTheDocument();
    expect(screen.getByText("É palíndromo?")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sua sequência" })).toBeNull();
  });

  it("depois de concluir mostra o selo e o botão de revisar", async () => {
    concluiu("desafios-do-dia", "relogio-digital");

    await montar(await DesafiosPage());

    expect(await screen.findByText(/Cumprido · \+100 XP/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Revisar desafio" }),
    ).toHaveAttribute("href", "/desafios/relogio-digital");
  });

  it("sem desafio publicado, explica em vez de mostrar lista vazia", async () => {
    api.buscarDesafioDeHoje.mockResolvedValue({
      dia: "2026-11-04",
      desafio: null,
      proximos: [],
    });

    await montar(await DesafiosPage());

    expect(
      screen.getByText(/Ainda não há desafios publicados/),
    ).toBeInTheDocument();
  });

  it("deixa o erro da API subir para o error.tsx da rota", async () => {
    api.buscarDesafioDeHoje.mockRejectedValue(
      new ErroApi(0, "sem_conexao", "Servidor fora do ar."),
    );

    await expect(DesafiosPage()).rejects.toBeInstanceOf(ErroApi);
  });

  it("a tela de erro oferece tentar de novo", async () => {
    const reset = jest.fn();
    render(<Erro error={new Error("falhou")} reset={reset} />);

    await userEvent.click(
      screen.getByRole("button", { name: /tentar de novo/i }),
    );
    expect(reset).toHaveBeenCalled();
  });

  it("a tela de carregamento avisa quem usa leitor de tela", () => {
    const { container } = render(<Carregando />);
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
  });
});
