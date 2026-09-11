"use client";

import { useEffect, useState } from "react";

import { Sidebar, type Perfil } from "@/components/layout/Sidebar";
import { api, temSessao } from "@/lib/api";

export function SidebarDoAluno() {
  const [perfil, setPerfil] = useState<Perfil | undefined>(undefined);

  useEffect(() => {
    if (!temSessao()) return;

    let vivo = true;

    (async () => {
      try {
        const [usuario, progresso] = await Promise.all([
          api.eu(),
          api.progresso(),
        ]);

        if (!vivo) return;

        if (!progresso) {
          setPerfil({
            nome: usuario.nickname,
            nivel: 1,
            xp: 0,
            xpDoProximoNivel: 100,
          });
          return;
        }

        // No topo da tabela não existe próximo nível: a barra fica cheia.
        const restante = progresso.xp_para_o_proximo ?? progresso.xp_no_nivel;

        setPerfil({
          nome: usuario.nickname,
          nivel: progresso.nivel.numero,
          xp: progresso.xp_no_nivel,
          xpDoProximoNivel: restante,
        });
      } catch {
        // Sidebar não é lugar de mensagem de erro: sem dado, fica no neutro.
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  return <Sidebar perfil={perfil} />;
}