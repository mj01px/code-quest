/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/api";

const fetchFalso = jest.fn();

function resposta(corpo: unknown, status = 200, retryAfter?: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(retryAfter ? { "Retry-After": retryAfter } : {}),
    text: async () => (corpo === null ? "" : JSON.stringify(corpo)),
  } as Response;
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchFalso.mockReset();
  global.fetch = fetchFalso as unknown as typeof fetch;
  document.cookie = "cq_sessao=1";
});

afterEach(() => {
  jest.useRealTimers();
});

it("leitura com 429 espera e tenta de novo uma vez, sem mexer na sessão", async () => {
  fetchFalso
    .mockResolvedValueOnce(
      resposta({ error: { message: "devagar" } }, 429, "1"),
    )
    .mockResolvedValueOnce(resposta([], 200));

  const pedido = api.exerciciosConcluidos();
  await jest.advanceTimersByTimeAsync(1000);

  await expect(pedido).resolves.toEqual([]);
  expect(fetchFalso).toHaveBeenCalledTimes(2);
  const chamadas = fetchFalso.mock.calls.map((c) => String(c[0]));
  expect(chamadas.some((u) => u.includes("/auth/"))).toBe(false);
});

it("429 de novo depois da espera sobe como erro, sem laço", async () => {
  fetchFalso.mockResolvedValue(
    resposta({ error: { message: "devagar" } }, 429, "30"),
  );

  const pedido = api.exerciciosConcluidos();
  const verificacao = expect(pedido).rejects.toMatchObject({ status: 429 });
  await jest.advanceTimersByTimeAsync(3000);

  await verificacao;
  expect(fetchFalso).toHaveBeenCalledTimes(2);
});
