import { renderHook, waitFor } from "@testing-library/react";

import { api as apiReal, temSessao as temSessaoReal } from "@/lib/api";
import {
  chaveDaFase,
  chavesConcluidas,
  concluidasDaTrilha,
  contarPorTrilha,
  estaConcluida,
  normalizar,
  percentual,
  useConclusoes,
} from "@/lib/progresso";
import type { ExercicioConcluido } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  temSessao: jest.fn(),
  api: { exerciciosConcluidos: jest.fn() },
}));

const temSessao = temSessaoReal as jest.MockedFunction<typeof temSessaoReal>;
const exerciciosConcluidos = apiReal.exerciciosConcluidos as jest.MockedFunction<
  typeof apiReal.exerciciosConcluidos
>;

function concluido(extra: Partial<ExercicioConcluido> = {}): ExercicioConcluido {
  return {
    trilha_slug: "logica",
    exercicio_slug: "media",
    xp: 50,
    criado_em: "2026-09-10T12:00:00Z",
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  temSessao.mockReturnValue(true);
  exerciciosConcluidos.mockResolvedValue([]);
});

describe("normalizar", () => {
  it("aceita a lista que o backend promete", () => {
    expect(normalizar([concluido()])).toEqual([concluido()]);
  });

  it("descarta linha sem os dois slugs", () => {
    // Sem os dois slugs a chave viraria "undefined/undefined" e casaria com
    // qualquer outra linha quebrada — marca de concluído no exercício errado.
    const bruto = [
      concluido(),
      { ...concluido(), trilha_slug: "" },
      { ...concluido(), exercicio_slug: null },
      { xp: 10 },
      null,
      "texto",
    ];

    expect(normalizar(bruto)).toEqual([concluido()]);
  });

  it("devolve vazio quando a resposta nem é lista", () => {
    expect(normalizar({ trilha: "logica" })).toEqual([]);
    expect(normalizar(null)).toEqual([]);
    expect(normalizar(undefined)).toEqual([]);
  });

  it("completa xp e data ausentes em vez de descartar a linha", () => {
    // O slug é o que marca a fase; xp e data são enfeite da tela.
    const [linha] = normalizar([
      { trilha_slug: "logica", exercicio_slug: "media" },
    ]);

    expect(linha).toEqual({
      trilha_slug: "logica",
      exercicio_slug: "media",
      xp: 0,
      criado_em: "",
    });
  });
});

describe("agregações", () => {
  const lista = [
    concluido(),
    concluido({ exercicio_slug: "trocar" }),
    concluido({ trilha_slug: "python", exercicio_slug: "media" }),
  ];

  it("a chave junta trilha e fase", () => {
    // O slug do exercício só é único dentro da trilha: duas trilhas podem ter
    // uma fase "media", e sem o prefixo uma marcaria a outra.
    expect(chaveDaFase("logica", "media")).toBe("logica/media");

    const chaves = chavesConcluidas(lista);
    expect(estaConcluida(chaves, "logica", "media")).toBe(true);
    expect(estaConcluida(chaves, "python", "media")).toBe(true);
    expect(estaConcluida(chaves, "python", "trocar")).toBe(false);
  });

  it("conta por trilha", () => {
    const contagem = contarPorTrilha(lista);

    expect(contagem.get("logica")).toBe(2);
    expect(contagem.get("python")).toBe(1);
    expect(contagem.get("java")).toBeUndefined();
  });

  it("lista os slugs de uma trilha só", () => {
    expect(concluidasDaTrilha(lista, "logica")).toEqual(["media", "trocar"]);
    expect(concluidasDaTrilha(lista, "java")).toEqual([]);
  });
});

describe("percentual", () => {
  it("é zero quando a trilha não tem fase", () => {
    expect(percentual(0, 0)).toBe(0);
    expect(percentual(3, 0)).toBe(0);
  });

  it("trava em 100 quando o aluno fez fase que foi despublicada", () => {
    expect(percentual(5, 4)).toBe(100);
  });

  it("calcula a fração normal", () => {
    expect(percentual(1, 4)).toBe(25);
  });
});

describe("useConclusoes", () => {
  it("começa carregando e termina com a lista do servidor", async () => {
    exerciciosConcluidos.mockResolvedValue([concluido()]);

    const { result } = renderHook(() => useConclusoes());

    expect(result.current.carregando).toBe(true);
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.concluidos).toEqual([concluido()]);
    expect(estaConcluida(result.current.chaves, "logica", "media")).toBe(true);
  });

  it("repassa o filtro de trilha para a API", async () => {
    renderHook(() => useConclusoes("python"));

    await waitFor(() =>
      expect(exerciciosConcluidos).toHaveBeenCalledWith("python"),
    );
  });

  it("sem sessão não vai à rede e para de carregar", async () => {
    temSessao.mockReturnValue(false);

    const { result } = renderHook(() => useConclusoes());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(exerciciosConcluidos).not.toHaveBeenCalled();
    expect(result.current.concluidos).toEqual([]);
  });

  it("falha da API vira estado neutro, não tela quebrada", async () => {
    exerciciosConcluidos.mockRejectedValue(new Error("sem conexão"));

    const { result } = renderHook(() => useConclusoes());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.concluidos).toEqual([]);
  });

  it("descarta a resposta que chega depois de trocar de trilha", async () => {
    // Sem a trava de `ativo`, a resposta da trilha antiga sobrescreveria a da
    // nova e a tela marcaria fase de outra trilha.
    let resolverPrimeira: (v: ExercicioConcluido[]) => void = () => {};
    exerciciosConcluidos.mockImplementationOnce(
      () => new Promise((r) => (resolverPrimeira = r)),
    );
    exerciciosConcluidos.mockResolvedValueOnce([
      concluido({ trilha_slug: "python", exercicio_slug: "listas" }),
    ]);

    const { result, rerender } = renderHook(
      ({ trilha }: { trilha: string }) => useConclusoes(trilha),
      { initialProps: { trilha: "logica" } },
    );

    rerender({ trilha: "python" });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    resolverPrimeira([concluido()]);
    await Promise.resolve();

    expect(estaConcluida(result.current.chaves, "python", "listas")).toBe(true);
    expect(estaConcluida(result.current.chaves, "logica", "media")).toBe(false);
  });
});
