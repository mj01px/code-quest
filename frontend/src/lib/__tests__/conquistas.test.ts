import {
  ALTURA_DA_LINHA,
  TOPO_DO_MAPA,
  chaveDaConquista,
  colunasDoMapa,
  montarMapa,
  rotuloDoEstado,
  formatarDataDaConquista,
  fracaoDoProgresso,
  novasConquistas,
  resumir,
  rotuloDeRaridade,
} from "@/lib/conquistas";
import { conquista } from "@/components/__tests__/fixtures";

describe("conquistas", () => {
  it("novas são as desbloqueadas ainda não vistas", () => {
    const lista = [
      conquista({ slug: "a" }),
      conquista({ slug: "b", desbloqueada: true, vista: true }),
      conquista({ slug: "c", desbloqueada: true }),
    ];
    expect(novasConquistas(lista).map((c) => c.slug)).toEqual(["c"]);
  });

  it("resume total, desbloqueadas e percentual", () => {
    const lista = [
      conquista({ slug: "a", desbloqueada: true }),
      conquista({ slug: "b" }),
      conquista({ slug: "c" }),
      conquista({ slug: "d" }),
    ];
    expect(resumir(lista)).toEqual({ total: 4, desbloqueadas: 1, percentual: 25 });
    expect(resumir([])).toEqual({ total: 0, desbloqueadas: 0, percentual: 0 });
  });

  it("só tem fração de progresso quando a meta é maior que um", () => {
    expect(fracaoDoProgresso(conquista({ progresso: 3, meta: 5 }))).toBe(0.6);
    expect(fracaoDoProgresso(conquista({ progresso: 0, meta: 1 }))).toBeNull();
    expect(fracaoDoProgresso(conquista({ progresso: null, meta: null }))).toBeNull();
    expect(fracaoDoProgresso(conquista({ desbloqueada: true }))).toBe(1);
  });

  it("oculta sem slug ganha chave estável pela posição", () => {
    expect(chaveDaConquista(conquista({ slug: null }), 4)).toBe("oculta-4");
    expect(chaveDaConquista(conquista(), 0)).toBe("hello-world");
  });

  it("formata raridade e data em pt-BR", () => {
    expect(rotuloDeRaridade(12.5)).toBe("12,5% dos alunos");
    expect(rotuloDeRaridade(0)).toBe("0% dos alunos");
    expect(formatarDataDaConquista(null)).toBe("");
    expect(formatarDataDaConquista("invalida")).toBe("");
    expect(formatarDataDaConquista("2026-10-18T15:00:00Z")).toBe("18/10/2026");
  });

  it("escolhe colunas pela largura", () => {
    expect(colunasDoMapa(1000)).toBe(4);
    expect(colunasDoMapa(600)).toBe(3);
    expect(colunasDoMapa(320)).toBe(2);
    expect(colunasDoMapa(0)).toBe(2);
  });

  it("monta o mapa em serpentina", () => {
    const lista = Array.from({ length: 6 }, (_, i) =>
      conquista({ slug: `c${i}`, desbloqueada: i < 2 }),
    );
    const mapa = montarMapa(lista, 4);

    expect(mapa.posicoes.map((p) => p.esquerda)).toEqual([
      12.5, 37.5, 62.5, 87.5, 87.5, 62.5,
    ]);
    expect(mapa.posicoes[4].topo).toBe(TOPO_DO_MAPA + ALTURA_DA_LINHA);
    expect(mapa.pontos).toHaveLength(4 * 4 + 3);
    expect(mapa.pontos.slice(0, 4).every((p) => p.aceso)).toBe(true);
    expect(mapa.pontos.slice(4).some((p) => p.aceso)).toBe(false);
    expect(mapa.altura).toBeGreaterThan(mapa.posicoes[5].topo);
  });

  it("nomeia o estado para o modal", () => {
    expect(rotuloDoEstado(conquista({ desbloqueada: true }))).toBe(
      "CONQUISTA DESBLOQUEADA",
    );
    expect(rotuloDoEstado(conquista({ oculta: true }))).toBe("CONQUISTA OCULTA");
    expect(rotuloDoEstado(conquista())).toBe("BLOQUEADA");
  });
});
