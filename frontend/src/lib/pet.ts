import type { MinhaCriatura } from "@/lib/types";

export const SPRITE_SEM_PET = "/marca/ovo.png";

export function spriteDoPet(criatura: MinhaCriatura | null): string {
  return criatura?.sprite ?? SPRITE_SEM_PET;
}

export function spriteDeDialogo(criatura: MinhaCriatura | null): string {
  if (criatura === null) return SPRITE_SEM_PET;
  const estagio = criatura.criatura.estagios.find(
    (item) => item.estagio === criatura.estagio_atual,
  );
  return estagio?.sprite_dialogo ?? spriteDoPet(criatura);
}
