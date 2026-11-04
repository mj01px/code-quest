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
  document.cookie = "cq_sessao=1";
  document.cookie = "csrftoken=abc";
});

it("pedidos em paralelo com token expirado renovam uma vez só e não derrubam a sessão", async () => {
  let renovado = false;
  let renovacoes = 0;
  fetchFalso.mockImplementation(async (url: string) => {
    if (url.includes("/auth/renovar/")) {
      renovacoes += 1;
      if (renovado) return resposta({ error: { message: "token na blacklist" } }, 401);
      renovado = true;
      return resposta(null, 204);
    }
    if (url.includes("/auth/sair/")) return resposta(null, 204);
    return renovado ? resposta([], 200) : resposta({ error: { message: "expirado" } }, 401);
  });

  const resultados = await Promise.all([
    api.trilhasIniciadas(),
    api.etapasConcluidas(),
    api.exerciciosConcluidos(),
  ]);

  expect(resultados).toEqual([[], [], []]);
  expect(renovacoes).toBe(1);
  const chamadas = fetchFalso.mock.calls.map((c) => String(c[0]));
  expect(chamadas.some((u) => u.includes("/auth/sair/"))).toBe(false);
});
