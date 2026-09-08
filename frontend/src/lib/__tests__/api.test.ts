/**
 * @jest-environment node
 */
import { ErroApi, buscarExercicio, buscarTrilha, listarTrilhas } from "@/lib/api";

const fetchFalso = jest.fn();

beforeEach(() => {
  fetchFalso.mockReset();
  global.fetch = fetchFalso as unknown as typeof fetch;
});

function resposta(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === null ? "" : JSON.stringify(corpo)),
  } as Response;
}

describe("listarTrilhas", () => {
  it("chama o endpoint de listagem", async () => {
    fetchFalso.mockResolvedValue(resposta([]));

    await listarTrilhas();

    expect(fetchFalso).toHaveBeenCalledWith(
      expect.stringContaining("/trilhas/"),
      expect.anything(),
    );
  });

  it("pede cache revalidado ao Next", async () => {
    fetchFalso.mockResolvedValue(resposta([]));

    await listarTrilhas();

    expect(fetchFalso).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        next: { revalidate: 60, tags: ["trilhas"] },
      }),
    );
  });
});

describe("buscarTrilha", () => {
  it("escapa o slug na URL", async () => {
    fetchFalso.mockResolvedValue(resposta({}));

    await buscarTrilha("a/b");

    expect(fetchFalso).toHaveBeenCalledWith(
      expect.stringContaining("/trilhas/a%2Fb/"),
      expect.anything(),
    );
  });

  it("marca 404 como naoEncontrado", async () => {
    fetchFalso.mockResolvedValue(resposta(null, 404));

    await expect(buscarTrilha("some")).rejects.toMatchObject({
      status: 404,
      naoEncontrado: true,
    });
  });

  it("não marca 500 como naoEncontrado", async () => {
    fetchFalso.mockResolvedValue(resposta(null, 500));

    await expect(buscarTrilha("some")).rejects.toMatchObject({
      status: 500,
      naoEncontrado: false,
    });
  });

  it("converte falha de rede em ErroApi sem conexão", async () => {
    fetchFalso.mockRejectedValue(new Error("ECONNREFUSED"));

    const erro = await buscarTrilha("some").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).code).toBe("sem_conexao");
    expect((erro as ErroApi).naoEncontrado).toBe(false);
  });
});

describe("buscarExercicio", () => {
  it("monta a rota com trilha e exercício", async () => {
    fetchFalso.mockResolvedValue(resposta({}));

    await buscarExercicio("logica", "contar-vogais");

    expect(fetchFalso).toHaveBeenCalledWith(
      expect.stringContaining("/exercicios/logica/contar-vogais/"),
      expect.anything(),
    );
  });
});
