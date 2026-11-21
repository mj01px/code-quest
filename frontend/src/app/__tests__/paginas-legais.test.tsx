import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { ErroApi } from "@/lib/api";

import PaginaFaq from "../faq/page";
import PaginaPrivacidade from "../privacidade/page";
import PaginaSuporte from "../suporte/page";
import PaginaTermos from "../termos/page";

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    buscarDocumentosLegais: jest.fn(),
    buscarDocumentoLegal: jest.fn(),
  };
});

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const api = jest.requireMock<{
  buscarDocumentosLegais: jest.Mock;
  buscarDocumentoLegal: jest.Mock;
}>("@/lib/api");

const PASTA = join(__dirname, "../../../../backend/apps/contas/documentos_legais");

function documento(slug: "termos" | "privacidade", versao = "1.3") {
  return {
    documento: slug === "termos" ? "TERMOS" : "PRIVACIDADE",
    rotulo: slug === "termos" ? "Termos de Uso" : "Política de Privacidade",
    versao,
    vigente_desde: versao === "1.3" ? "2026-11-19" : "2026-09-26",
    caminho: `/${slug}`,
    conteudo: readFileSync(join(PASTA, `${slug}-${versao}.md`), "utf-8"),
    vigente: versao === "1.3",
    historico: [
      { versao: "1.3", vigente_desde: "2026-11-19" },
      { versao: "1.2", vigente_desde: "2026-09-26" },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  api.buscarDocumentoLegal.mockImplementation(
    async (slug: "termos" | "privacidade", versao?: string) => documento(slug, versao),
  );
});

describe("Termos de Uso", () => {
  it("mostra a versão vigente que veio da API", async () => {
    render(await PaginaTermos());

    expect(screen.getByText("VERSÃO 1.3")).toBeInTheDocument();
    expect(api.buscarDocumentoLegal).toHaveBeenCalledWith("termos", undefined);
  });

  it("exibe a data sem deslocar o dia por causa do fuso", async () => {
    render(await PaginaTermos());

    expect(screen.getByText("VIGENTE DESDE 19/11/2026")).toBeInTheDocument();
  });

  it("numera as seções do texto e monta o índice com elas", async () => {
    render(await PaginaTermos());

    expect(
      screen.getByRole("heading", { level: 2, name: /Quem pode criar conta/ }),
    ).toBeInTheDocument();
    const indice = screen.getByRole("navigation", { name: "Neste documento" });
    expect(indice.querySelectorAll("li")).toHaveLength(11);
  });

  it("exige 18 anos", async () => {
    render(await PaginaTermos());

    expect(screen.getByText("18 anos ou mais")).toBeInTheDocument();
  });

  it("continua abrindo quando a API não responde, com aviso", async () => {
    api.buscarDocumentoLegal.mockRejectedValue(
      new ErroApi(503, "indisponivel", "fora do ar"),
    );

    render(await PaginaTermos());

    expect(
      screen.getByRole("heading", { level: 1, name: /TERMOS/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/VERSÃO/)).not.toBeInTheDocument();
    expect(screen.getByText(/Não foi possível carregar o documento/)).toBeInTheDocument();
  });

  it("aponta para a Política de Privacidade e para o suporte", async () => {
    render(await PaginaTermos());

    const destinos = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(destinos).toEqual(expect.arrayContaining(["/privacidade", "/suporte"]));
  });

  it("mostra uma versão anterior com aviso e link para a vigente", async () => {
    render(
      await PaginaTermos({ searchParams: Promise.resolve({ versao: "1.2" }) }),
    );

    expect(api.buscarDocumentoLegal).toHaveBeenCalledWith("termos", "1.2");
    expect(screen.getByText(/não está mais em vigor/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver a versão vigente" })).toHaveAttribute(
      "href",
      "/termos",
    );
    expect(screen.getByText("16 anos ou mais")).toBeInTheDocument();
  });

  it("responde 404 para versão que não existe", async () => {
    api.buscarDocumentoLegal.mockRejectedValue(
      new ErroApi(404, "not_found", "Versão não encontrada."),
    );

    await expect(
      PaginaTermos({ searchParams: Promise.resolve({ versao: "9.9" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
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

  it("cita o ECA Digital e o prazo de retenção", async () => {
    render(await PaginaPrivacidade());

    expect(screen.getByText(/Lei nº 15\.211\/2025/)).toBeInTheDocument();
    expect(screen.getByText("1 ano")).toBeInTheDocument();
  });

  it("lista as outras versões", async () => {
    render(await PaginaPrivacidade());

    expect(
      screen.getByRole("link", { name: /VERSÃO 1\.2/ }),
    ).toHaveAttribute("href", "/privacidade?versao=1.2");
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
