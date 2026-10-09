import {
  BANDEIRAS,
  acoesDeMembro,
  bandeira,
  ehGestor,
  formatarData,
  iniciais,
} from "@/lib/clas";
import type { Bandeira, Cargo, MembroDoCla } from "@/lib/types";

function membro(cargo: Cargo, nickname = "alvo"): MembroDoCla {
  return {
    id: `id-${nickname}`,
    nickname,
    cargo,
    cargo_rotulo: cargo,
    entrou_em: "2026-09-14T00:00:00Z",
  };
}

describe("bandeira", () => {
  it("devolve a info da bandeira pedida", () => {
    expect(bandeira("guilda_3").src).toBe("/clas/guilda_3.png");
  });

  it("cai na primeira quando o slug é desconhecido", () => {
    expect(bandeira("guilda_9" as Bandeira)).toBe(BANDEIRAS[0]);
  });
});

describe("iniciais", () => {
  it("usa as duas primeiras letras em caixa alta", () => {
    expect(iniciais("kiuev")).toBe("KI");
    expect(iniciais("Caio_Script")).toBe("CA");
  });

  it("vira ?? quando o nome está vazio", () => {
    expect(iniciais("   ")).toBe("??");
  });
});

describe("formatarData", () => {
  it("formata ISO como dd/mm/aaaa", () => {
    expect(formatarData("2026-09-14T12:00:00Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("devolve vazio para entrada inválida", () => {
    expect(formatarData("não é data")).toBe("");
  });
});

describe("ehGestor", () => {
  it("é verdadeiro para líder e co-líder", () => {
    expect(ehGestor("LIDER")).toBe(true);
    expect(ehGestor("COLIDER")).toBe(true);
  });

  it("é falso para membro", () => {
    expect(ehGestor("MEMBRO")).toBe(false);
  });
});

describe("acoesDeMembro", () => {
  it("não oferece ação sobre si mesmo", () => {
    expect(acoesDeMembro("LIDER", membro("MEMBRO"), true)).toEqual([]);
  });

  it("não oferece ação sobre o líder", () => {
    expect(acoesDeMembro("LIDER", membro("LIDER"), false)).toEqual([]);
  });

  it("líder promove, passa liderança e expulsa um membro", () => {
    expect(acoesDeMembro("LIDER", membro("MEMBRO"), false)).toEqual([
      "promover",
      "transferir",
      "expulsar",
    ]);
  });

  it("líder rebaixa, passa liderança e expulsa um co-líder", () => {
    expect(acoesDeMembro("LIDER", membro("COLIDER"), false)).toEqual([
      "rebaixar",
      "transferir",
      "expulsar",
    ]);
  });

  it("co-líder só promove e expulsa membro", () => {
    expect(acoesDeMembro("COLIDER", membro("MEMBRO"), false)).toEqual([
      "promover",
      "expulsar",
    ]);
  });

  it("co-líder não mexe em outro co-líder", () => {
    expect(acoesDeMembro("COLIDER", membro("COLIDER"), false)).toEqual([]);
  });

  it("membro não tem nenhuma ação de gestão", () => {
    expect(acoesDeMembro("MEMBRO", membro("MEMBRO"), false)).toEqual([]);
    expect(acoesDeMembro("MEMBRO", membro("COLIDER"), false)).toEqual([]);
  });
});
