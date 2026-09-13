import { render, screen, waitFor } from "@testing-library/react";

import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";
import { PainelDeTrilhas } from "@/components/trilhas/PainelDeTrilhas";
import { api as apiReal, temSessao as temSessaoReal } from "@/lib/api";
import type { ExercicioConcluido, TrilhaDetalhe } from "@/lib/types";

import {
  aula,
  exercicioResumo,
  minhaCriatura,
  progressoAtual,
  trilhaResumo,
  usuario,
} from "./fixtures";

// O progresso vem da API, não do `localStorage`. Semear storage aqui era o que
// deixava esta suíte verde com a funcionalidade quebrada: o teste descrevia o
// armazenamento local, e o produto passou a ler do servidor.
jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: {
    exerciciosConcluidos: jest.fn(),
    trilhasIniciadas: jest.fn(),
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
  },
}));

const temSessao = temSessaoReal as jest.MockedFunction<typeof temSessaoReal>;
const eu = apiReal.eu as jest.MockedFunction<typeof apiReal.eu>;
const minhasCriaturas = apiReal.minhasCriaturas as jest.MockedFunction<
  typeof apiReal.minhasCriaturas
>;
const meuProgresso = apiReal.meuProgresso as jest.MockedFunction<
  typeof apiReal.meuProgresso
>;
const exerciciosConcluidos =
  apiReal.exerciciosConcluidos as jest.MockedFunction<
    typeof apiReal.exerciciosConcluidos
  >;

const TRILHA = trilhaResumo({ total_aulas: 2, total_exercicios: 4 });

const DESTAQUE: TrilhaDetalhe = {
  ...TRILHA,
  resumo: "",
  sobre: "",
  aulas: [
    aula({
      exercicios: [
        exercicioResumo({ id: 1, slug: "media", titulo: "Média" }),
        exercicioResumo({ id: 2, slug: "trocar", titulo: "Trocar valores" }),
      ],
    }),
    aula({
      id: 11,
      titulo: "Condicionais",
      slug: "condicionais",
      ordem: 2,
      exercicios: [
        exercicioResumo({ id: 3, slug: "par", titulo: "Par ou ímpar" }),
        exercicioResumo({ id: 4, slug: "maior", titulo: "O maior de três" }),
      ],
    }),
  ],
};

/** Responde o que o backend responderia para essas fases concluídas. */
function comProgresso(fases: string[]): void {
  exerciciosConcluidos.mockResolvedValue(
    fases.map((slug, indice): ExercicioConcluido => ({
      trilha_slug: TRILHA.slug,
      exercicio_slug: slug,
      xp: 50,
      criado_em: `2026-09-0${indice + 1}T12:00:00Z`,
    })),
  );
}

async function montar(destaque: TrilhaDetalhe | null = DESTAQUE) {
  render(
    <ProvedorProgresso>
      <PainelDeTrilhas trilhas={[TRILHA]} destaque={destaque ?? undefined} />
    </ProvedorProgresso>,
  );
  await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  comProgresso([]);
  eu.mockResolvedValue(usuario());
  minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  meuProgresso.mockResolvedValue(progressoAtual());
});

describe("PainelDeTrilhas", () => {
  it("pede a lista inteira, sem filtro de trilha", async () => {
    // A tela agrega por trilha: um pedido só custa menos que um por card.
    // Quem busca é o provedor, e busca sem argumento nenhum.
    await montar();

    expect(exerciciosConcluidos).toHaveBeenCalledWith();
    expect(exerciciosConcluidos).toHaveBeenCalledTimes(1);
  });

  it("convida a começar quando o aluno ainda não fez nada", async () => {
    await montar();

    expect(screen.getByText("Comece por aqui")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Começar" })).toHaveAttribute(
      "href",
      "/trilhas/logica-de-programacao",
    );
  });

  it("oferece continuar de onde parou e aponta para a fase seguinte", async () => {
    comProgresso(["media", "trocar"]);

    await montar();

    expect(
      await screen.findByText("Continuar de onde parou"),
    ).toBeInTheDocument();
    // Primeira fase não concluída, na ordem da trilha.
    expect(screen.getByText("Módulo 2 · Par ou ímpar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retomar" })).toHaveAttribute(
      "href",
      "/trilhas/logica-de-programacao/exercicios/par",
    );
  });

  it("anuncia a trilha concluída quando não sobra fase", async () => {
    comProgresso(["media", "trocar", "par", "maior"]);

    await montar();

    expect(await screen.findByText("Trilha concluída")).toBeInTheDocument();
    expect(screen.getByText("4 fases concluídas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revisar" })).toBeInTheDocument();
  });

  it("reflete o percentual real na barra do destaque", async () => {
    comProgresso(["media"]);

    await montar();

    await waitFor(() => {
      const [destaque] = screen.getAllByRole("progressbar");
      expect(destaque).toHaveAttribute("aria-valuenow", "25");
    });
  });

  it("passa o progresso adiante para o card da trilha", async () => {
    comProgresso(["media", "trocar", "par"]);

    await montar();

    expect(await screen.findByText("75%")).toBeInTheDocument();
  });

  it("funciona sem o detalhe do destaque", async () => {
    comProgresso(["media"]);

    await montar(null);

    // Sem a trilha inteira não dá para dizer onde parou, mas o card da lista
    // continua mostrando o percentual.
    expect(screen.getByText("Comece por aqui")).toBeInTheDocument();
    expect(await screen.findByText("25%")).toBeInTheDocument();
  });

  it("conclusão de outra trilha não conta no percentual desta", async () => {
    // A chave do progresso é (trilha, fase): sem o prefixo da trilha, uma fase
    // "media" de outra trilha marcaria esta.
    exerciciosConcluidos.mockResolvedValue([
      {
        trilha_slug: "python",
        exercicio_slug: "media",
        xp: 50,
        criado_em: "2026-09-01T12:00:00Z",
      },
    ]);

    await montar();

    expect(screen.getByText("Comece por aqui")).toBeInTheDocument();
    expect(screen.queryByText("25%")).not.toBeInTheDocument();
  });

  it("sem sessão mostra o estado neutro e não vai à rede", async () => {
    temSessao.mockReturnValue(false);

    // Não usa `montar`: sem sessão não há pedido pelo qual esperar.
    render(
      <ProvedorProgresso>
        <PainelDeTrilhas trilhas={[TRILHA]} destaque={DESTAQUE} />
      </ProvedorProgresso>,
    );

    await waitFor(() =>
      expect(screen.getByText("Comece por aqui")).toBeInTheDocument(),
    );
    expect(exerciciosConcluidos).not.toHaveBeenCalled();
  });
});
