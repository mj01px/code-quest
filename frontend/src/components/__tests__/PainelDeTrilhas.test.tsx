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
    etapasConcluidas: jest.fn(),
    trilhaAtual: jest.fn(),
    trilhasIniciadas: jest.fn(),
    eu: jest.fn(),
    minhasCriaturas: jest.fn(),
    meuProgresso: jest.fn(),
    minhaSequencia: jest.fn(),
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
const minhaSequencia = apiReal.minhaSequencia as jest.MockedFunction<
  typeof apiReal.minhaSequencia
>;
const exerciciosConcluidos =
  apiReal.exerciciosConcluidos as jest.MockedFunction<
    typeof apiReal.exerciciosConcluidos
  >;
const trilhaAtual = apiReal.trilhaAtual as jest.MockedFunction<
  typeof apiReal.trilhaAtual
>;
const etapasConcluidas = apiReal.etapasConcluidas as jest.MockedFunction<
  typeof apiReal.etapasConcluidas
>;

function comLeituras(aulas: string[]): void {
  etapasConcluidas.mockResolvedValue(
    aulas.map((aulaSlug) => ({
      trilha_slug: TRILHA.slug,
      aula_slug: aulaSlug,
      tipo: "LEITURA" as const,
      acertos: null,
      total: null,
      concluida_em: "2026-09-01T12:00:00Z",
    })),
  );
}

const TRILHA = trilhaResumo({ total_aulas: 2, total_exercicios: 4 });

const DESTAQUE: TrilhaDetalhe = {
  ...TRILHA,
  resumo: "",
  sobre: "",
  criado_por: null,
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
      <PainelDeTrilhas
        trilhas={[TRILHA]}
        detalhes={destaque ? { [TRILHA.slug]: destaque } : {}}
      />
    </ProvedorProgresso>,
  );
  await waitFor(() => expect(exerciciosConcluidos).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  comProgresso([]);
  comLeituras([]);
  trilhaAtual.mockResolvedValue({ trilha: TRILHA.slug });
  eu.mockResolvedValue(usuario());
  minhasCriaturas.mockResolvedValue([minhaCriatura({ ativa: true })]);
  meuProgresso.mockResolvedValue(progressoAtual());
  minhaSequencia.mockResolvedValue({
    atual: 0,
    recorde: 0,
    feito_hoje: false,
    ultimo_dia: null,
  });
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

  it("leva à lição do módulo quando ela ainda não foi lida", async () => {
    comProgresso(["media", "trocar"]);

    await montar();

    expect(
      await screen.findByText("Módulo 2 · Lição: Condicionais"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retomar" })).toHaveAttribute(
      "href",
      "/trilhas/logica-de-programacao/aulas/condicionais",
    );
  });

  it("soma leitura e quiz feitos na porcentagem da trilha", async () => {
    comProgresso(["media"]);
    comLeituras(["variaveis-e-tipos"]);

    render(
      <ProvedorProgresso>
        <PainelDeTrilhas
          trilhas={[{ ...TRILHA, total_etapas: 1 }]}
          detalhes={{ [TRILHA.slug]: DESTAQUE }}
        />
      </ProvedorProgresso>,
    );

    expect(await screen.findByText("40%")).toBeInTheDocument();
  });

  it("oferece continuar de onde parou e aponta para a fase seguinte", async () => {
    comProgresso(["media", "trocar"]);
    comLeituras(["condicionais"]);

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

  it("o destaque segue a trilha ativa, não a primeira da lista", async () => {
    const python = trilhaResumo({
      id: 2,
      slug: "python",
      nome: "Python",
      ordem: 2,
    });
    trilhaAtual.mockResolvedValue({ trilha: "python" });

    render(
      <ProvedorProgresso>
        <PainelDeTrilhas
          trilhas={[TRILHA, python]}
          detalhes={{
            [TRILHA.slug]: DESTAQUE,
            python: { ...DESTAQUE, ...python },
          }}
        />
      </ProvedorProgresso>,
    );

    expect(
      await screen.findByRole("heading", { name: "Python" }),
    ).toBeInTheDocument();
  });

  it("sem trilha em andamento convida a iniciar uma", async () => {
    trilhaAtual.mockResolvedValue({ trilha: null });

    await montar();

    expect(await screen.findByText("Inicie uma trilha já")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma trilha em andamento")).toBeInTheDocument();
  });

  it("sem sessão mostra o estado neutro e não vai à rede", async () => {
    temSessao.mockReturnValue(false);

    // Não usa `montar`: sem sessão não há pedido pelo qual esperar.
    render(
      <ProvedorProgresso>
        <PainelDeTrilhas
          trilhas={[TRILHA]}
          detalhes={{ [TRILHA.slug]: DESTAQUE }}
        />
      </ProvedorProgresso>,
    );

    await waitFor(() =>
      expect(screen.getByText("Comece por aqui")).toBeInTheDocument(),
    );
    expect(exerciciosConcluidos).not.toHaveBeenCalled();
  });
});
