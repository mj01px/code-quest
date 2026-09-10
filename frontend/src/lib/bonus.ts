import type { BonusXp } from "@/lib/types";

// O bônus de XP vem do par criatura/trilha guardado no servidor. Ausência de
// linha significa XP neutro, então "sem bônus" é resposta normal, não erro.

export const MULTIPLICADOR_NEUTRO = 1;

/** O bônus da trilha, se ele render mais que o XP neutro. */
export function bonusDaTrilha(
  bonus: readonly BonusXp[],
  trilhaSlug: string,
): BonusXp | null {
  return (
    bonus.find(
      (item) =>
        item.trilha === trilhaSlug && item.multiplicador > MULTIPLICADOR_NEUTRO,
    ) ?? null
  );
}

/** "2" para 2.00 e "1,5" para 1.50: o "x" fica com quem monta o texto. */
export function formatarMultiplicador(valor: number): string {
  const arredondado = Math.round(valor * 100) / 100;
  return Number.isInteger(arredondado)
    ? String(arredondado)
    : String(arredondado).replace(".", ",");
}
