import type { VersaoDeDocumento } from "@/lib/types";
import {
  compararVersoes,
  formatarDia,
  hojeIso,
  proximaVersao,
  situacaoDoDocumento,
} from "@/lib/versoesDeDocumentos";

function versao(extra: Partial<VersaoDeDocumento>): VersaoDeDocumento {
  return {
    id: extra.versao ?? "id",
    documento: "TERMOS",
    rotulo: "Termos de Uso",
    versao: "1.0",
    conteudo: "## Seção",
    situacao: "PUBLICADA",
    vigente_desde: "2026-01-01",
    vigente: false,
    criado_por: null,
    criado_em: "2026-01-01T00:00:00Z",
    atualizado_em: "2026-01-01T00:00:00Z",
    publicado_por: null,
    publicado_em: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

describe("versões", () => {
  it("compara por número, não por texto", () => {
    expect(compararVersoes("1.10", "1.9")).toBeGreaterThan(0);
    expect(compararVersoes("1.2", "1.2.0")).toBe(0);
    expect(compararVersoes("1.2", "2")).toBeLessThan(0);
  });

  it("sugere a próxima versão", () => {
    expect(proximaVersao(null)).toBe("1.0");
    expect(proximaVersao("1.3")).toBe("1.4");
    expect(proximaVersao("2")).toBe("2.1");
    expect(proximaVersao("1.9")).toBe("1.10");
  });

  it("formata datas sem passar pelo fuso", () => {
    expect(hojeIso(new Date(2026, 10, 19, 23, 30))).toBe("2026-11-19");
    expect(formatarDia("2026-11-19")).toBe("19/11/2026");
  });

  it("separa vigente, agendadas e rascunho de cada documento", () => {
    const situacao = situacaoDoDocumento(
      [
        versao({ versao: "1.2" }),
        versao({ versao: "1.3", vigente: true }),
        versao({ versao: "1.4", vigente_desde: "2999-01-01" }),
        versao({ versao: "1.5", situacao: "RASCUNHO", publicado_em: null }),
        versao({ versao: "9.9", documento: "PRIVACIDADE" }),
      ],
      "TERMOS",
    );

    expect(situacao.vigente?.versao).toBe("1.3");
    expect(situacao.agendadas.map((v) => v.versao)).toEqual(["1.4"]);
    expect(situacao.rascunho?.versao).toBe("1.5");
    expect(situacao.publicadas.map((v) => v.versao)).toEqual(["1.4", "1.3", "1.2"]);
  });
});
