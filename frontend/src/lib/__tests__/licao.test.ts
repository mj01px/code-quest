import {
  blocosDaLicao,
  idDaSecao,
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

  it("estima a leitura em pelo menos um minuto", () => {
    expect(minutosDeLeitura("curta")).toBe(1);
    expect(minutosDeLeitura("palavra ".repeat(900))).toBe(5);
  });
});
