"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { AvatarPixel } from "@/components/ui/AvatarPixel";
import { api, temSessao } from "@/lib/api";
import type { MinhaCriatura, Usuario } from "@/lib/types";

// O bloco de identidade da sidebar. Sem sessão ele fica no estado neutro que a
// sidebar já mostrava; com sessão, o ovo dá lugar à criatura escolhida e o
// "Visitante" ao nickname. Falhar aqui não pode derrubar a navegação, então
// qualquer erro cai de volta no estado neutro em silêncio.

interface Identidade {
  usuario: Usuario;
  posse: MinhaCriatura | null;
}

export function IdentidadeDoAluno({
  nome,
  nivel,
}: {
  /** Mostrado enquanto não há sessão ou enquanto o perfil não chegou. */
  nome: string;
  nivel: number;
}) {
  const [identidade, setIdentidade] = useState<Identidade | null>(null);

  useEffect(() => {
    if (!temSessao()) return;

    let ativo = true;
    (async () => {
      try {
        const [usuario, criaturas] = await Promise.all([
          api.eu(),
          api.minhasCriaturas(),
        ]);
        if (!ativo) return;
        setIdentidade({
          usuario,
          posse: criaturas.find((c) => c.ativa) ?? criaturas[0] ?? null,
        });
      } catch {
        /* segue com o estado neutro */
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const criatura = identidade?.posse ?? null;
  const sprite = criatura?.sprite ?? null;

  return (
    <div className="animate-surgir mt-6 flex items-center gap-3">
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
        <p className="rotulo mt-1 text-brand">Nível {nivel}</p>
      </div>
    </div>
  );
}
