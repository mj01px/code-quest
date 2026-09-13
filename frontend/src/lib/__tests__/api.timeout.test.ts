/**
 * @jest-environment jsdom
 */
import { ErroApi, buscarTrilha } from "@/lib/api";

// O bug que motivou o prazo: um fetch que nunca assenta deixava o botão preso
// em "Registrando…" para sempre. Testar o mapeamento do erro não prova isso —
// só prova que existe prazo um fetch que de fato nunca resolve sozinho.

const fetchFalso = jest.fn();

beforeEach(() => {
  fetchFalso.mockReset();
  global.fetch = fetchFalso as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

/** Só assenta se alguém abortar; é o "servidor pendurado". */
function nuncaResponde() {
  return jest.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_resolver, rejeitar) => {
        init.signal?.addEventListener("abort", () => {
          rejeitar((init.signal as AbortSignal).reason);
        });
      }),
  );
}

describe("no navegador", () => {
  it("anexa o prazo ao pedido", async () => {
    fetchFalso.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    } as Response);

    await buscarTrilha("logica");

    const [, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });

  it("desiste de um servidor pendurado em vez de esperar para sempre", async () => {
    jest.useFakeTimers();
    global.fetch = nuncaResponde() as unknown as typeof fetch;

    const promessa = buscarTrilha("logica").catch((e: unknown) => e);
    jest.advanceTimersByTime(15_000);
    const erro = await promessa;

    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).code).toBe("tempo_esgotado");
    expect((erro as ErroApi).message).toMatch(/lenta/);
  });

  it("não desiste antes da hora", async () => {
    jest.useFakeTimers();
    global.fetch = nuncaResponde() as unknown as typeof fetch;

    let assentou = false;
    void buscarTrilha("logica").catch(() => {
      assentou = true;
    });

    jest.advanceTimersByTime(14_000);
    await Promise.resolve();

    expect(assentou).toBe(false);
  });
});
