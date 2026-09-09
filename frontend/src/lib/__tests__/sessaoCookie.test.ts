/**
 * @jest-environment jsdom
 */
import { api, temSessao } from "@/lib/api";

const fetchFalso = jest.fn();

function resposta(corpo: unknown = null, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === null ? "" : JSON.stringify(corpo)),
  } as Response;
}

function limparCookies() {
  for (const par of document.cookie.split(";")) {
    const nome = par.split("=")[0].trim();
    if (nome) document.cookie = `${nome}=; max-age=0; path=/`;
  }
}

beforeEach(() => {
  fetchFalso.mockReset().mockResolvedValue(resposta());
  global.fetch = fetchFalso as unknown as typeof fetch;
  limparCookies();
});

function opcoesDaChamada(indice = 0) {
  return fetchFalso.mock.calls[indice][1] as RequestInit;
}

function cabecalhos(indice = 0) {
  return (opcoesDaChamada(indice).headers ?? {}) as Record<string, string>;
}

describe("temSessao", () => {
  it("é falso sem o cookie sinalizador", () => {
    expect(temSessao()).toBe(false);
  });

  it("é verdadeiro com o sinalizador marcado", () => {
    document.cookie = "cq_sessao=1; path=/";
    expect(temSessao()).toBe(true);
  });

  it("não depende do token, que é httpOnly e invisível aqui", () => {
    document.cookie = "cq_access=qualquer-coisa; path=/";
    expect(temSessao()).toBe(false);
  });
});

describe("envio de credencial", () => {
  it("manda os cookies em toda requisição", async () => {
    await api.eu();

    expect(opcoesDaChamada().credentials).toBe("same-origin");
  });

  it("usa caminho relativo, ou seja, a mesma origem", async () => {
    await api.eu();

    expect(fetchFalso.mock.calls[0][0]).toBe("/api/v1/auth/eu/");
  });

  it("não manda mais Authorization", async () => {
    document.cookie = "cq_access=um-token; path=/";

    await api.eu();

    expect(cabecalhos()).not.toHaveProperty("Authorization");
  });
});

describe("CSRF", () => {
  it("manda o token nas escritas", async () => {
    document.cookie = "csrftoken=abc123; path=/";

    await api.sair();

    expect(cabecalhos()["X-CSRFToken"]).toBe("abc123");
  });

  it("não manda o token nas leituras", async () => {
    document.cookie = "csrftoken=abc123; path=/";

    await api.eu();

    expect(cabecalhos()).not.toHaveProperty("X-CSRFToken");
  });

  it("busca o token antes de escrever quando ainda não tem", async () => {
    fetchFalso.mockImplementation(async (url: string) => {
      if (url.includes("/auth/csrf/")) {
        document.cookie = "csrftoken=obtido-na-hora; path=/";
      }
      return resposta();
    });

    await api.sair();

    expect(fetchFalso.mock.calls[0][0]).toBe("/api/v1/auth/csrf/");
    expect(cabecalhos(1)["X-CSRFToken"]).toBe("obtido-na-hora");
  });

  it("segue sem o cabeçalho se o token não vier, deixando o servidor recusar", async () => {
    await api.sair();

    expect(cabecalhos(1)).not.toHaveProperty("X-CSRFToken");
  });
});
