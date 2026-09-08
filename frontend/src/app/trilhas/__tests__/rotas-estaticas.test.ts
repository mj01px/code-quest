// A lista de parâmetros estáticos é o que faz o 404 ser real.
import { trilhaResumo } from "@/components/__tests__/fixtures";

import {
  dynamicParams as dynamicParamsExercicio,
  generateStaticParams as paramsDeExercicios,
} from "../[trilhaSlug]/exercicios/[exercicioSlug]/page";
import {
  dynamicParams as dynamicParamsTrilha,
  generateStaticParams as paramsDeTrilhas,
} from "../[trilhaSlug]/page";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    listarTrilhas: jest.fn(),
    buscarTrilha: jest.fn(),
    buscarExercicio: jest.fn(),
  };
});

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const api = jest.requireMock<{
  listarTrilhas: jest.Mock;
  buscarTrilha: jest.Mock;
}>("@/lib/api");

function comAulas(slug: string, exercicios: string[][]) {
  return {
    ...trilhaResumo({ slug }),
    aulas: exercicios.map((slugs, indice) => ({
      id: indice,
      titulo: `Fase ${indice}`,
      slug: `fase-${indice}`,
      conteudo: "",
      ordem: indice,
      pre_requisito: null,
      exercicios: slugs.map((s, i) => ({
        id: i,
        titulo: s,
        slug: s,
        tipo: "CODIGO" as const,
        tipo_label: "Código",
        dificuldade: "INICIANTE" as const,
        dificuldade_label: "Iniciante",
        ordem: i,
      })),
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("parâmetros estáticos", () => {
  it("as duas rotas recusam parâmetros fora da lista", () => {
    expect(dynamicParamsTrilha).toBe(false);
    expect(dynamicParamsExercicio).toBe(false);
  });

  it("gera um caminho por trilha publicada", async () => {
    api.listarTrilhas.mockResolvedValue([
      trilhaResumo({ slug: "logica" }),
      trilhaResumo({ id: 2, slug: "python" }),
    ]);

    await expect(paramsDeTrilhas()).resolves.toEqual([
      { trilhaSlug: "logica" },
      { trilhaSlug: "python" },
    ]);
  });

  it("gera um caminho por exercício de cada trilha", async () => {
    api.listarTrilhas.mockResolvedValue([trilhaResumo({ slug: "logica" })]);
    api.buscarTrilha.mockResolvedValue(
      comAulas("logica", [["media", "trocar"], ["par"]]),
    );

    await expect(paramsDeExercicios()).resolves.toEqual([
      { trilhaSlug: "logica", exercicioSlug: "media" },
      { trilhaSlug: "logica", exercicioSlug: "trocar" },
      { trilhaSlug: "logica", exercicioSlug: "par" },
    ]);
  });

  it("não repete caminho quando duas fases usam o mesmo slug", async () => {
    // Rede de segurança: o backend já garante slug único por trilha.
    api.listarTrilhas.mockResolvedValue([trilhaResumo({ slug: "logica" })]);
    api.buscarTrilha.mockResolvedValue(
      comAulas("logica", [["pratica"], ["pratica"]]),
    );

    await expect(paramsDeExercicios()).resolves.toEqual([
      { trilhaSlug: "logica", exercicioSlug: "pratica" },
    ]);
  });

  it("devolve lista vazia quando não há trilha publicada", async () => {
    api.listarTrilhas.mockResolvedValue([]);

    await expect(paramsDeTrilhas()).resolves.toEqual([]);
    await expect(paramsDeExercicios()).resolves.toEqual([]);
  });
});
