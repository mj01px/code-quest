"use client";

import Image from "next/image";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { AvatarPixel } from "@/components/ui/AvatarPixel";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";

// Os dados vêm do Context, não de busca própria: este componente montava e
// buscava de novo a cada troca de página, e era isso que fazia o bloco piscar.
// O provedor vive no layout do route group e não desmonta na navegação.

export function IdentidadeDoAluno({
  nome,
  nivel,
  xp,
  xpDoProximoNivel,
}: {
  /** Mostrado enquanto não há sessão. */
  nome: string;
  nivel: number;
  xp: number;
  xpDoProximoNivel: number;
}) {
  const { usuario, criatura, progresso, carregando } = useProgresso();

  const sprite = criatura?.sprite ?? null;

  const nivelAtual = progresso?.nivel.numero ?? nivel;
  const xpNoNivel = progresso?.xp_no_nivel ?? xp;
  // `xp_para_o_proximo` é null no topo da tabela: ali a barra fica cheia.
  const xpDoNivel = progresso ? progresso.xp_para_o_proximo : xpDoProximoNivel;
  const noTopo = progresso !== null && xpDoNivel === null;
  const alvo = xpDoNivel ?? 0;
  const progressoXp = noTopo ? 100 : alvo > 0 ? (xpNoNivel / alvo) * 100 : 0;

  return (
    <div
      // Enquanto o número não chegou, o bloco existe com as mesmas dimensões e
      // invisível: nada de número inventado, nada de esqueleto com forma de
      // número, e nenhum salto de layout quando o valor real entra.
      className={`animate-surgir mt-6 transition-opacity duration-150 ${
        carregando ? "opacity-0" : "opacity-100"
      }`}
      aria-busy={carregando}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-brand bg-panel-soft p-1 transition-shadow hover:shadow-halo">
          {sprite && criatura ? (
            <Image
              src={sprite}
              alt={`${criatura.criatura.nome}, sua criatura`}
              width={48}
              height={48}
              className="animate-bob block h-full w-full object-contain"
            />
          ) : (
            <AvatarPixel className="h-full w-full" />
          )}
        </span>
        <div className="min-w-0">
          <p className="titulo truncate text-sm text-ink-soft">
            {usuario?.nickname ?? nome}
          </p>
          <p className="rotulo mt-1 text-brand">Nível {nivelAtual}</p>
        </div>
      </div>

      <div className="mt-4">
        <BarraSegmentada
          valor={progressoXp}
          segmentos={12}
          expandida
          rotulo={
            noTopo
              ? "Nível máximo alcançado"
              : `Progresso para o nível ${nivelAtual + 1}`
          }
        />
        <p className="rotulo mt-2 text-ink-muted">
          {noTopo ? `${xpNoNivel} XP` : `${xpNoNivel} / ${alvo} XP`}
        </p>
      </div>
    </div>
  );
}
