"use client";

import { useEffect, useState } from "react";

import { CARD, CartoesNumeros } from "@/components/dashboard/CartoesNumeros";
import { GraficoAtividade } from "@/components/dashboard/GraficoAtividade";
import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { DashboardAdmin } from "@/lib/types";

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; dados: DashboardAdmin };

export function AdminDashboard() {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .adminDashboard()
      .then((dados) => {
        if (ativo) setCarga({ tipo: "pronto", dados });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (carga.tipo === "carregando") {
    return (
      <p className={`${TIPO.etiqueta} text-ink-muted`} aria-busy="true">
        Carregando...
      </p>
    );
  }

  if (carga.tipo === "erro") {
    return (
      <p role="alert" className={`${TIPO.corpo} text-danger`}>
        Não foi possível carregar as métricas agora. Recarregue a página.
      </p>
    );
  }

  const { dados } = carga;
  const novos = dados.novos_usuarios_semana.reduce((t, d) => t + d.quantidade, 0);
  return (
    <div className="flex flex-col gap-8">
      <CartoesNumeros
        numeros={[
          { rotulo: "USUÁRIOS", valor: dados.total_usuarios, sufixo: `+${novos} na semana` },
          { rotulo: "TRILHAS", valor: dados.trilhas_publicadas, sufixo: "publicadas" },
          { rotulo: "FILA DE REVISÃO", valor: dados.fila_revisao },
          { rotulo: "SUBMISSÕES", valor: dados.submissoes_judge },
          { rotulo: "MÉDIA XP/USUÁRIO", valor: dados.media_xp_por_usuario },
          {
            rotulo: "MÉDIA SUBMISSÕES/USUÁRIO",
            valor: dados.media_submissoes_por_usuario,
          },
          { rotulo: "TAXA DE APROVAÇÃO", valor: dados.taxa_aprovacao_submissoes, sufixo: "%" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <GraficoAtividade
            titulo="Submissões"
            rotulo="Submissões aprovadas e rejeitadas nos últimos 7 dias"
            dias={dados.submissoes_semana}
            series={[
              { chave: "aprovadas", cor: "#4fc98a", nome: "Aprovadas" },
              { chave: "rejeitadas", cor: "#f87171", nome: "Rejeitadas" },
            ]}
          />
        </section>
        <section className={CARD}>
          <GraficoAtividade
            titulo="Novos usuários"
            rotulo="Cadastros por dia nos últimos 7 dias"
            dias={dados.novos_usuarios_semana}
            series={[{ chave: "quantidade", cor: "#A855F7", nome: "Cadastros" }]}
          />
        </section>
      </div>

    </div>
  );
}
