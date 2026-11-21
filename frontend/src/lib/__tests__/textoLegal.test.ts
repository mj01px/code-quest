import { estruturarDocumento, linkSeguro, trechosLegais } from "@/lib/textoLegal";

describe("linkSeguro", () => {
  it.each([
    ["/privacidade", true],
    ["mailto:contato@codequest.com.br", false],
    ["https://www.gov.br/anpd", false],
  ])("aceita %s", (href, interno) => {
    expect(linkSeguro(href)).toEqual({ href, interno });
  });

  it.each([
    "javascript:alert(1)",
    "//outro-site.com",
    "http://sem-tls.com",
    "data:text/html,oi",
    "mailto:sem-arroba",
    "/\\outro-site.com",
    "/caminho com espaço",
  ])("recusa %s", (href) => {
    expect(linkSeguro(href)).toBeNull();
  });
});

describe("trechosLegais", () => {
  it("separa texto, negrito e links", () => {
    expect(
      trechosLegais("Leia a **Política** em [privacidade](/privacidade)."),
    ).toEqual([
      { tipo: "texto", texto: "Leia a " },
      { tipo: "forte", texto: "Política" },
      { tipo: "texto", texto: " em " },
      { tipo: "link", texto: "privacidade", href: "/privacidade", interno: true },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("transforma link perigoso em texto puro", () => {
    expect(trechosLegais("[clique](javascript:alert(1))")).toEqual([
      { tipo: "texto", texto: "clique" },
      { tipo: "texto", texto: ")" },
    ]);
  });
});

describe("estruturarDocumento", () => {
  it("numera as seções na ordem e guarda o texto antes da primeira", () => {
    const { introducao, secoes } = estruturarDocumento(
      "Preâmbulo.\n\n## Primeira\n\nTexto.\n\n## Segunda\n\n- item",
    );

    expect(introducao).toEqual([{ tipo: "paragrafo", texto: "Preâmbulo." }]);
    expect(secoes.map((s) => [s.numero, s.titulo])).toEqual([
      [1, "Primeira"],
      [2, "Segunda"],
    ]);
    expect(secoes[1].blocos).toEqual([{ tipo: "lista", ordenada: false, itens: ["item"] }]);
  });
});

describe("títulos numerados à mão", () => {
  it("não repetem o número que a página já coloca", () => {
    const { secoes } = estruturarDocumento("## 1. Sobre\n\nx\n\n## 2) Contato\n\ny");

    expect(secoes.map((s) => s.titulo)).toEqual(["Sobre", "Contato"]);
  });
});
