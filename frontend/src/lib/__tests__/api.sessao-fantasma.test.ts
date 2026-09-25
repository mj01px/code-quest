/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/api";

const fetchFalso = jest.fn();

function resposta(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === null ? "" : JSON.stringify(corpo)),
  } as Response;
}

beforeEach(() => {
  fetchFalso.mockReset();
  global.fetch = fetchFalso as unknown as typeof fetch;
  // Cookie-sinal presente: o navegador "acha" que há sessão.
  document.cookie = "cq_sessao=1";
});

describe("sessão fantasma (token órfão)", () => {
  it("purga a sessão morta e refaz o pedido público como anônimo", async () => {
    const documentos = { termos: {}, privacidade: {} };
    fetchFalso
      .mockResolvedValueOnce(resposta({ error: { message: "User not found" } }, 401))
      .mockResolvedValueOnce(resposta(null, 204)) // POST /auth/sair/ (purga)
      .mockResolvedValueOnce(resposta(documentos, 200)); // retry

    const resultado = await api.documentosLegais();

    expect(resultado).toEqual(documentos);
    const chamadas = fetchFalso.mock.calls.map((c) => String(c[0]));
    expect(chamadas.some((u) => u.includes("/auth/sair/"))).toBe(true);
    expect(fetchFalso).toHaveBeenCalledTimes(3);
  });

  it("sem cookie-sinal, um 401 sobe direto sem tentar purgar", async () => {
    document.cookie = "cq_sessao=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    fetchFalso.mockResolvedValue(
      resposta({ error: { message: "nope" } }, 401),
    );

    await expect(api.documentosLegais()).rejects.toMatchObject({ status: 401 });
    // Só o pedido original — nenhuma chamada a /auth/sair/.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
