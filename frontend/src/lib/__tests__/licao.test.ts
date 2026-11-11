import {
  blocosDaLicao,
  idDaSecao,
  licaoEditavel,
  markdownDaLicao,
  minutosDeLeitura,
  rotuloDaSecao,
  secoesDaLicao,
  trechosInline,
} from "@/lib/licao";

const LICAO = `Abertura da lição.

## 1. Guardar um valor

Texto com \`codigo\` e **negrito**.

\`\`\`python
idade = 17
\`\`\`

> **Regra prática:** leia o = como recebe.

| Tipo | Exemplo |
|---|---|
| \`int\` | 17 |

1. Primeiro passo.
2. Segundo passo.

- item solto

## Resumo
`;

describe("blocosDaLicao", () => {
  const blocos = blocosDaLicao(LICAO);

  it("reconhece cada tipo de bloco na ordem", () => {
    expect(blocos.map((b) => b.tipo)).toEqual([
      "paragrafo",
      "secao",
      "paragrafo",
      "codigo",
      "destaque",
      "tabela",
      "lista",
      "lista",
      "secao",
    ]);
  });

  it("guarda a linguagem do bloco de código", () => {
    expect(blocos[3]).toEqual({ tipo: "codigo", linguagem: "python", texto: "idade = 17" });
  });

  it("descarta a linha separadora da tabela", () => {
    expect(blocos[5]).toEqual({
      tipo: "tabela",
      cabecalho: ["Tipo", "Exemplo"],
      linhas: [["`int`", "17"]],
    });
  });

  it("separa lista numerada de lista solta", () => {
    expect(blocos[6]).toMatchObject({ ordenada: true, itens: ["Primeiro passo.", "Segundo passo."] });
    expect(blocos[7]).toMatchObject({ ordenada: false, itens: ["item solto"] });
  });
});

describe("trechosInline", () => {
  it("separa código, negrito e texto", () => {
    expect(trechosInline("use `int()` e **converta** antes")).toEqual([
      { tipo: "texto", texto: "use " },
      { tipo: "codigo", texto: "int()" },
      { tipo: "texto", texto: " e " },
      { tipo: "forte", texto: "converta" },
      { tipo: "texto", texto: " antes" },
    ]);
  });

  it("não interpreta HTML", () => {
    expect(trechosInline("<b>x</b>")).toEqual([{ tipo: "texto", texto: "<b>x</b>" }]);
  });
});

describe("seções da lição", () => {
  it("gera âncoras sem número, acento nem pontuação", () => {
    expect(idDaSecao("2. O sinal de igual é uma ordem")).toBe("o-sinal-de-igual-e-uma-ordem");
  });

  it("lista as seções para o índice", () => {
    expect(secoesDaLicao(LICAO)).toEqual([
      {
        id: "guardar-um-valor",
        titulo: "1. Guardar um valor",
        destaque: "**Regra prática:** leia o = como recebe.",
      },
      { id: "resumo", titulo: "Resumo", destaque: null },
    ]);
  });

  it("tira o número do rótulo", () => {
    expect(rotuloDaSecao("3. Cada valor tem um tipo")).toBe("Cada valor tem um tipo");
  });

  it("fatia a lição nas mesmas seções do índice do aluno", () => {
    const { intro, secoes } = licaoEditavel(LICAO);
    expect(intro).toBe("Abertura da lição.");
    expect(secoes.map((s) => s.titulo)).toEqual(secoesDaLicao(LICAO).map((s) => s.titulo));
    expect(secoes[0].texto).toMatch(/^Texto com `codigo`/);
    expect(secoes[0].texto).toContain("- item solto");
    expect(secoes[1]).toEqual({ titulo: "Resumo", texto: "" });
  });

  it("ida e volta não muda o que o aluno vê", () => {
    const volta = markdownDaLicao(licaoEditavel(LICAO));
    expect(blocosDaLicao(volta)).toEqual(blocosDaLicao(LICAO));
    expect(markdownDaLicao(licaoEditavel(volta))).toBe(volta);
  });

  it("## dentro de cerca de código não corta a seção", () => {
    const md = "## Comentários\n\n```python\n## não é seção\nx = 1\n```\n\nFim.";
    const { secoes } = licaoEditavel(md);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].texto).toContain("## não é seção");
    expect(markdownDaLicao(licaoEditavel(md))).toBe(md);
  });

  it("lição sem ## vira só introdução; vazia, nada", () => {
    expect(licaoEditavel("Só texto.\n\n### Sub")).toEqual({ intro: "Só texto.\n\n### Sub", secoes: [] });
    expect(licaoEditavel("")).toEqual({ intro: "", secoes: [] });
    expect(markdownDaLicao({ intro: "", secoes: [] })).toBe("");
  });

  it("monta o Markdown com o título como ## e o texto abaixo", () => {
    expect(
      markdownDaLicao({
        intro: "Abertura.",
        secoes: [
          { titulo: " Tipos ", texto: "\n\n  - recuado\n" },
          { titulo: "Fim", texto: "" },
        ],
      }),
    ).toBe("Abertura.\n\n## Tipos\n\n  - recuado\n\n## Fim");
  });

  it.each([
    ["CRLF", "Abertura.\r\n\r\n## A\r\n\r\ntexto"],
    ["## sem espaço", "##A não é seção\n\n## B\n\nb"],
    ["título com #", "## # Foo #\n\nx"],
    ["linhas em branco e recuo no início", "\n\n## A\n\n\n  - recuado"],
    ["sem introdução", "## A\n\na"],
    ["cerca aberta no fim", "## A\n\n```py\nx = 1"],
  ])("ida e volta preserva o que o aluno vê: %s", (_, md) => {
    expect(blocosDaLicao(markdownDaLicao(licaoEditavel(md)))).toEqual(blocosDaLicao(md));
  });

  it("cerca aberta numa seção não engole a seguinte", () => {
    const md = markdownDaLicao({
      intro: "",
      secoes: [
        { titulo: "A", texto: "```py\nx = 1" },
        { titulo: "B", texto: "texto B" },
      ],
    });
    expect(secoesDaLicao(md).map((s) => s.titulo)).toEqual(["A", "B"]);
    expect(licaoEditavel(md).secoes).toHaveLength(2);
  });

  it("seção sem título nem texto não vira um ## solto", () => {
    expect(
      markdownDaLicao({ intro: "", secoes: [{ titulo: "A", texto: "a" }, { titulo: " ", texto: "\n" }] }),
    ).toBe("## A\n\na");
  });

  it("estima a leitura em pelo menos um minuto", () => {
    expect(minutosDeLeitura("curta")).toBe(1);
    expect(minutosDeLeitura("palavra ".repeat(900))).toBe(5);
  });
});
