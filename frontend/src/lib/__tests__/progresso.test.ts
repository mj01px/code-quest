import {
  CHAVE,
  alternar,
  assinar,
  concluidas,
  estaConcluida,
  esquecerCache,
  instantaneo,
  instantaneoNoServidor,
  percentual,
} from "@/lib/progresso";

function gravado(): unknown {
  const cru = window.localStorage.getItem(CHAVE);
  return cru === null ? null : JSON.parse(cru);
}

beforeEach(() => {
  window.localStorage.clear();
  esquecerCache();
});

describe("leitura", () => {
  it("começa vazio quando nunca houve progresso", () => {
    expect(instantaneo()).toEqual({});
  });

  it("no servidor devolve sempre o vazio", () => {
    window.localStorage.setItem(CHAVE, JSON.stringify({ logica: ["um"] }));

    expect(instantaneoNoServidor()).toEqual({});
  });

  it("devolve o mesmo objeto entre leituras", () => {
    // useSyncExternalStore compara por identidade: outro objeto a cada leitura
    // colocaria o React em laço de render.
    expect(instantaneo()).toBe(instantaneo());
  });

  it("ignora conteúdo que não tem o formato esperado", () => {
    window.localStorage.setItem(
      CHAVE,
      JSON.stringify({ logica: ["um", 2, null, "um"], python: "nao-e-lista" }),
    );

    expect(instantaneo()).toEqual({ logica: ["um"] });
  });

  it("não quebra com JSON corrompido", () => {
    window.localStorage.setItem(CHAVE, "{isto nao e json");

    expect(instantaneo()).toEqual({});
  });
});

describe("marcar e desmarcar", () => {
  it("guarda a fase concluída e persiste no storage", () => {
    alternar("logica", "media-de-duas-notas");

    expect(estaConcluida(instantaneo(), "logica", "media-de-duas-notas")).toBe(
      true,
    );
    expect(gravado()).toEqual({ logica: ["media-de-duas-notas"] });
  });

  it("desmarca a mesma fase no segundo clique", () => {
    alternar("logica", "tabuada");
    alternar("logica", "tabuada");

    expect(concluidas(instantaneo(), "logica")).toEqual([]);
    // Trilha zerada sai do objeto em vez de virar chave com lista vazia.
    expect(gravado()).toEqual({});
  });

  it("mantém as trilhas separadas", () => {
    alternar("logica", "tabuada");
    alternar("python", "listas");

    expect(concluidas(instantaneo(), "logica")).toEqual(["tabuada"]);
    expect(concluidas(instantaneo(), "python")).toEqual(["listas"]);
  });

  it("sobrevive a uma releitura do storage", () => {
    alternar("logica", "fatorial");
    esquecerCache();

    expect(concluidas(instantaneo(), "logica")).toEqual(["fatorial"]);
  });

  it("avisa quem estiver assinando", () => {
    const ouvinte = jest.fn();
    const cancelar = assinar(ouvinte);

    alternar("logica", "tabuada");
    expect(ouvinte).toHaveBeenCalledTimes(1);

    cancelar();
    alternar("logica", "fatorial");
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("reage à mudança feita em outra aba", () => {
    const ouvinte = jest.fn();
    const cancelar = assinar(ouvinte);

    window.localStorage.setItem(CHAVE, JSON.stringify({ logica: ["tabuada"] }));
    window.dispatchEvent(new StorageEvent("storage", { key: CHAVE }));

    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(concluidas(instantaneo(), "logica")).toEqual(["tabuada"]);
    cancelar();
  });

  it("ignora evento de outra chave do storage", () => {
    const ouvinte = jest.fn();
    const cancelar = assinar(ouvinte);

    window.dispatchEvent(
      new StorageEvent("storage", { key: "codequest:sidebar" }),
    );

    expect(ouvinte).not.toHaveBeenCalled();
    cancelar();
  });
});

describe("percentual", () => {
  it.each([
    [0, 26, 0],
    [13, 26, 50],
    [26, 26, 100],
  ])("%i de %i fases dá %i%%", (feitas, total, esperado) => {
    expect(percentual(feitas, total)).toBe(esperado);
  });

  it("devolve zero quando a trilha ainda não tem fase", () => {
    expect(percentual(0, 0)).toBe(0);
  });

  it("não passa de 100 se uma fase concluída for despublicada", () => {
    expect(percentual(9, 6)).toBe(100);
  });
});
