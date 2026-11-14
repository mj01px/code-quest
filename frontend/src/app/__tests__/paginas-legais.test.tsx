import { render, screen } from "@testing-library/react";

import { ErroApi } from "@/lib/api";

import PaginaFaq from "../faq/page";
import PaginaPrivacidade from "../privacidade/page";
import PaginaSuporte from "../suporte/page";
import PaginaTermos from "../termos/page";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return { ErroApi: real.ErroApi, buscarDocumentosLegais: jest.fn() };
});

const api = jest.requireMock<{ buscarDocumentosLegais: jest.Mock }>(
  "@/lib/api",
);

const DOCUMENTOS = {
  termos: {
    documento: "TERMOS",
    rotulo: "Termos de Uso",
    versao: "1.0",
    vigente_desde: "2026-09-08",
    caminho: "/termos",
  },
  privacidade: {
    documento: "PRIVACIDADE",
    rotulo: "Política de Privacidade",
    versao: "1.0",
    vigente_desde: "2026-09-08",
    caminho: "/privacidade",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  api.buscarDocumentosLegais.mockResolvedValue(DOCUMENTOS);
});

describe("Termos de Uso", () => {
  it("mostra a versão vigente que veio da API", async () => {
    render(await PaginaTermos());

    expect(screen.getByText("VERSÃO 1.0")).toBeInTheDocument();
  });

  it("exibe a data sem deslocar o dia por causa do fuso", async () => {
    render(await PaginaTermos());

    expect(screen.getByText("VIGENTE DESDE 08/09/2026")).toBeInTheDocument();
  });

  it("continua abrindo quando a API não responde, só sem o selo", async () => {
    api.buscarDocumentosLegais.mockRejectedValue(
      new ErroApi(503, "indisponivel", "fora do ar"),
    );

    render(await PaginaTermos());

    expect(
      screen.getByRole("heading", { level: 1, name: /TERMOS/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/VERSÃO/)).not.toBeInTheDocument();
  });

  it("aponta para a Política de Privacidade e para o suporte", async () => {
    render(await PaginaTermos());

    const destinos = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(destinos).toEqual(expect.arrayContaining(["/privacidade", "/suporte"]));
  });
});

describe("Política de Privacidade", () => {
  it("lista no inventário o que o backend realmente guarda", async () => {
    render(await PaginaPrivacidade());

    for (const dado of ["E-mail", "Nickname", "Senha"]) {
      expect(
        screen.getByRole("cell", { name: new RegExp(`^${dado}$`) }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("columnheader", { name: "Base legal" })).toBeInTheDocument();
  });

  it("declara que o progresso fica na conta e nada vai para o armazenamento local", async () => {
    render(await PaginaPrivacidade());

    expect(
      screen.getByText(/não grava nada no armazenamento local/),
    ).toBeInTheDocument();
  });

  it("declara que a exclusão é imediata, sem prazo de arrependimento", async () => {
    render(await PaginaPrivacidade());

    expect(screen.getByText(/não existe prazo para desistir/)).toBeInTheDocument();
  });

  it("lista os cookies que a plataforma realmente usa", async () => {
    render(await PaginaPrivacidade());

    for (const cookie of ["cq_access", "cq_refresh", "cq_sessao", "csrftoken"]) {
      expect(screen.getByText(cookie)).toBeInTheDocument();
    }
  });

  it("explica por que não existe banner de cookies", async () => {
    render(await PaginaPrivacidade());

    expect(
      screen.getByText(/cookie estritamente necessário ao serviço/),
    ).toBeInTheDocument();
  });
});

describe("Suporte", () => {
  it("abre sem depender da API de documentos", async () => {
    api.buscarDocumentosLegais.mockRejectedValue(new Error("offline"));

    render(await PaginaSuporte());

    expect(
      screen.getByRole("heading", { level: 1, name: /SUPORTE/ }),
    ).toBeInTheDocument();
    expect(api.buscarDocumentosLegais).not.toHaveBeenCalled();
  });

  it("manda as dúvidas frequentes para o FAQ", async () => {
    render(await PaginaSuporte());

    expect(
      screen.getByRole("link", { name: "Perguntas Frequentes" }),
    ).toHaveAttribute("href", "/faq");
  });

  it("identifica o canal como o do encarregado de dados", async () => {
    render(await PaginaSuporte());

    expect(screen.getByText(/art\. 41 da LGPD/)).toBeInTheDocument();
  });
});

describe("FAQ", () => {
  it("abre sem depender da API de documentos", async () => {
    render(await PaginaFaq({}));

    expect(
      screen.getByRole("heading", { level: 1, name: /FAQ/ }),
    ).toBeInTheDocument();
    expect(api.buscarDocumentosLegais).not.toHaveBeenCalled();
  });

  it("abre na categoria e na busca que vieram na URL", async () => {
    render(
      await PaginaFaq({
        searchParams: Promise.resolve({ q: "ranking" }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Resultados da busca" }),
    ).toBeInTheDocument();
  });

  it("termina apontando para o suporte", async () => {
    render(await PaginaFaq({}));

    expect(
      screen.getByRole("link", { name: "IR PARA O SUPORTE" }),
    ).toHaveAttribute("href", "/suporte");
  });
});

describe("Rodapé", () => {
  it("não tem link quebrado: as quatro páginas existem", async () => {
    render(await PaginaTermos());

    const rodape = screen.getByRole("contentinfo");
    const destinos = Array.from(rodape.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(destinos).toEqual(["/termos", "/privacidade", "/faq", "/suporte"]);
  });
});
