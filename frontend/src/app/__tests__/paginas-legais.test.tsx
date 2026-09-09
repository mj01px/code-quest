import { render, screen } from "@testing-library/react";

import { ErroApi } from "@/lib/api";

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

  it("declara que o progresso das trilhas não sai do navegador", async () => {
    render(await PaginaPrivacidade());

    expect(
      screen.getByText(/progresso nas trilhas não é enviado para o servidor/),
    ).toBeInTheDocument();
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

  it("responde pelo que a plataforma faz hoje, não pelo que vai fazer", async () => {
    render(await PaginaSuporte());

    expect(
      screen.getByText(/recuperação automática de senha ainda não existe/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/progresso fica guardado no seu próprio navegador/),
    ).toBeInTheDocument();
  });

  it("identifica o canal como o do encarregado de dados", async () => {
    render(await PaginaSuporte());

    expect(screen.getByText(/art\. 41 da LGPD/)).toBeInTheDocument();
  });
});

describe("Rodapé", () => {
  it("não tem mais link quebrado: as três páginas existem", async () => {
    render(await PaginaTermos());

    const rodape = screen.getByRole("contentinfo");
    const destinos = Array.from(rodape.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(destinos).toEqual(["/termos", "/privacidade", "/suporte"]);
  });
});
