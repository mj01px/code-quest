import type { Cargo } from "@/lib/types";

import { classeBadgeCargo } from "./estilos";

export function BadgeCargo({ cargo, rotulo }: { cargo: Cargo; rotulo: string }) {
  return <span className={classeBadgeCargo(cargo)}>{rotulo}</span>;
}
