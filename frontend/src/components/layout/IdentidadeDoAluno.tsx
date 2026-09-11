"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { AvatarPixel } from "@/components/ui/AvatarPixel";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { api, temSessao } from "@/lib/api";
import type { MinhaCriatura, ProgressoAtual, Usuario } from "@/lib/types";

// O bloco de identidade da sidebar: quem é o aluno, qual criatura o acompanha e
// onde ele está na barra de XP. Sem sessão fica no estado neutro que a sidebar
// já mostrava. Falhar aqui não pode derrubar a navegação, então qualquer erro
// cai de volta no estado neutro em silêncio.
//
// A barra de XP mora aqui, e não na `Sidebar`, porque o número é da conta e só
// existe depois de uma chamada autenticada — e a `Sidebar` é Server Component.

interface Identidade {
  usuario: Usuario;
  posse: MinhaCriatura | null;
  progresso: ProgressoAtual | null;
}

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
  const [identidade, setIdentidade] = useState<Identidade | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    // Sem sessão não há perfil a buscar, mas o desfecho ainda passa pela
    // promessa: `setState` no corpo do efeito dispara render em cascata.
    const pedido = temSessao()
      ? Promise.all([api.eu(), api.minhasCriaturas(), api.meuProgresso()])
      : Promise.resolve(null);

    pedido
      .then((dados) => {
        if (!ativo || dados === null) return;
        const [usuario, criaturas, progresso] = dados;
        setIdentidade({
          usuario,
          posse: criaturas.find((c) => c.ativa) ?? criaturas[0] ?? null,
          progresso,
        });
      })
      .catch(() => {
        /* segue com o estado neutro */
      })
      .finally(() => {
        // Vale para os dois desfechos: falhar não pode deixar o bloco
        // invisível para sempre.
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const criatura = identidade?.posse ?? null;
  const sprite = criatura?.sprite ?? null;
  const progresso = identidade?.progresso ?? null;

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
            {identidade?.usuario.nickname ?? nome}
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
