import { SPRITE_SEM_PET, spriteDeDialogo, spriteDoPet } from "@/lib/pet";
import type { MinhaCriatura } from "@/lib/types";

function criatura(estagio: 1 | 2 | 3, comDialogo = true): MinhaCriatura {
  return {
    estagio_atual: estagio,
    sprite: `/criaturas/shellby_stage_${estagio}.png`,
    criatura: {
      nome: "Shellby",
      estagios: [1, 2, 3].map((n) => ({
        estagio: n,
        rotulo: `Estágio ${n}`,
        nivel_minimo: n,
        sprite: `/criaturas/shellby_stage_${n}.png`,
        sprite_dialogo: comDialogo ? `/criaturas/shellby_stage_${n}_dialog.png` : null,
      })),
    },
  } as unknown as MinhaCriatura;
}

describe("sprites do pet", () => {
  it("usa o balão do estágio atual da criatura", () => {
    expect(spriteDeDialogo(criatura(1))).toBe("/criaturas/shellby_stage_1_dialog.png");
    expect(spriteDeDialogo(criatura(3))).toBe("/criaturas/shellby_stage_3_dialog.png");
  });

  it("cai no sprite normal quando o estágio não tem balão", () => {
    expect(spriteDeDialogo(criatura(2, false))).toBe("/criaturas/shellby_stage_2.png");
  });

  it("mostra o ovo para quem ainda não tem pet", () => {
    expect(spriteDeDialogo(null)).toBe(SPRITE_SEM_PET);
    expect(spriteDoPet(null)).toBe(SPRITE_SEM_PET);
  });
});
