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

/** Métricas da plataforma inteira, na aba Dashboard do /admin. */
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

      <section className={CARD}>
        <h2 className={`${TIPO.tituloSecao} m-0 text-ink`}>Logs recentes</h2>
        {dados.logs_recentes.length === 0 ? (
          <p className={`${TIPO.corpo} m-0 text-ink-muted`}>Nenhum registro ainda.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {dados.logs_recentes.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap gap-x-3 border-b border-edge pb-2 font-body text-base tracking-[1px] last:border-b-0"
              >
                <time dateTime={log.criado_em} className="text-ink-muted">
                  [{formatarDataHora(log.criado_em)}]
                </time>
                <span className="text-ink">{log.usuario}</span>
                <span className="text-ink-body">{log.acao_rotulo}</span>
                {log.detalhes ? (
                  <span className="w-full text-sm text-ink-muted">{log.detalhes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
