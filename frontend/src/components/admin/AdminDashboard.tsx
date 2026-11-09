"use client";

import { useEffect, useState } from "react";

import {
  COR_APROVADA,
  COR_REJEITADA,
  Funil,
  GraficoFaixas,
  GraficoLinha,
  GraficoSubmissoes,
} from "@/components/admin/GraficosAdmin";
import { CARD } from "@/components/dashboard/CartoesNumeros";
import { PixelSelect } from "@/components/ui/PixelSelect";
import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { DashboardAdmin, PeriodoAdmin } from "@/lib/types";

const PERIODOS: { valor: PeriodoAdmin; rotulo: string; kpi: string }[] = [
  { valor: "hoje", rotulo: "Hoje", kpi: "hoje" },
  { valor: "7d", rotulo: "Últimos 7 dias", kpi: "na semana" },
  { valor: "30d", rotulo: "Últimos 30 dias", kpi: "em 30 dias" },
  { valor: "90d", rotulo: "Últimos 90 dias", kpi: "em 90 dias" },
];

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; dados: DashboardAdmin };

export function AdminDashboard({ atencao }: { atencao?: React.ReactNode }) {
  const [periodo, setPeriodo] = useState<PeriodoAdmin>("7d");
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });
  const [trilha, setTrilha] = useState("");

  useEffect(() => {
    let ativo = true;
    api
      .adminDashboard(periodo)
      .then((dados) => {
        if (ativo) setCarga({ tipo: "pronto", dados });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, [periodo]);

  const escolhido = PERIODOS.find((p) => p.valor === periodo) ?? PERIODOS[1];

  return (
    <div className="flex flex-col gap-6">
      <PixelSelect
        rotulo="PERÍODO"
        rotuloAoLado
        className="self-start sm:min-w-[300px]"
        value={periodo}
        onChange={(v) => {
          // Sem isso os números do período antigo aparecem com o rótulo do novo.
          setCarga({ tipo: "carregando" });
          setPeriodo(v as PeriodoAdmin);
        }}
        opcoes={PERIODOS.map((p) => ({ valor: p.valor, rotulo: p.rotulo }))}
      />

      {carga.tipo === "carregando" ? (
        <p className={`${TIPO.etiqueta} m-0 text-ink-muted`} aria-busy="true">
          Carregando...
        </p>
      ) : null}

      {carga.tipo === "erro" ? (
        <p role="alert" className={`${TIPO.corpo} m-0 text-danger`}>
          Não foi possível carregar as métricas agora. Recarregue a página.
        </p>
      ) : null}

      {carga.tipo === "pronto" ? (
        <Indicadores dados={carga.dados} sufixo={escolhido.kpi} />
      ) : null}

      {atencao}

      {carga.tipo === "pronto" ? (
        <Graficos
          dados={carga.dados}
          periodo={escolhido.rotulo}
          trilha={trilha}
          onTrilha={setTrilha}
        />
      ) : null}
    </div>
  );
}

function Indicadores({
  dados,
  sufixo,
}: {
  dados: DashboardAdmin;
  sufixo: string;
}) {
  const tiles = [
    {
      rotulo: "Usuários",
      valor: dados.usuarios.total,
      nota: `+${dados.usuarios.novos} ${sufixo}`,
    },
    {
      rotulo: `Ativos ${sufixo}`,
      valor: dados.ativos.total,
      nota: `${dados.ativos.percentual}% dos usuários`,
    },
    {
      rotulo: "Submissões",
      valor: dados.submissoes.total,
      nota: `${dados.submissoes.percentual_aprovadas}% aprovadas`,
      destaque: dados.submissoes.total > 0,
    },
    {
      rotulo: "Trilhas",
      valor: dados.trilhas.publicadas,
      nota: `publicadas · ${dados.trilhas.em_revisao} em revisão`,
    },
  ];

  return (
    <ul
      aria-label="Indicadores"
      className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4"
    >
      {tiles.map((t) => (
        <li key={t.rotulo} className={`${CARD} gap-2.5`}>
          <span className="font-label text-[10px] tracking-[2px] text-ink-muted uppercase">
            {t.rotulo}
          </span>
          <span className="font-display text-[22px] leading-none text-ink">
            {t.valor.toLocaleString("pt-BR")}
          </span>
          <span
            className={`font-label text-[10px] tracking-[1px] uppercase ${t.destaque ? "text-success" : "text-ink-muted"}`}
          >
            {t.nota}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Cabecalho({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className={`${TIPO.tituloSecao} m-0 text-ink`}>
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Legenda({ cor, nome }: { cor: string; nome: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5"
        style={{ background: cor }}
        aria-hidden="true"
      />
      {nome}
    </span>
  );
}

function Graficos({
  dados,
  periodo,
  trilha,
  onTrilha,
}: {
  dados: DashboardAdmin;
  periodo: string;
  trilha: string;
  onTrilha: (slug: string) => void;
}) {
  const funil = dados.funis.find((f) => f.slug === trilha) ?? dados.funis[0];
  const ativos = dados.ativos_por_dia.map((d) => ({
    data: d.data,
    valor: d.alunos,
  }));
  const hoje = ativos[ativos.length - 1]?.valor ?? 0;
  const enviadas = dados.submissoes_por_dia.reduce(
    (t, d) => t + d.aprovadas + d.rejeitadas,
    0,
  );
  const janela =
    `${periodo === "Hoje" ? "Últimos 7 dias" : periodo}`.toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section aria-labelledby="g-ativos" className={CARD}>
        <Cabecalho id="g-ativos" titulo="Alunos ativos por dia">
          <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
            {janela}
          </span>
        </Cabecalho>
        <GraficoLinha
          pontos={ativos}
          rotulo={`Alunos ativos por dia, ${janela.toLowerCase()}. Hoje: ${hoje}.`}
        />
      </section>

      <section aria-labelledby="g-sub" className={CARD}>
        <Cabecalho id="g-sub" titulo="Submissões por dia">
          <span className="flex gap-3.5 font-label text-[10px] tracking-[1px] text-ink-body">
            <Legenda cor={COR_APROVADA} nome="APROVADAS" />
            <Legenda cor={COR_REJEITADA} nome="REJEITADAS" />
          </span>
        </Cabecalho>
        <GraficoSubmissoes
          dias={dados.submissoes_por_dia}
          rotulo={`Submissões aprovadas e rejeitadas por dia, ${janela.toLowerCase()}: ${enviadas} no total.`}
        />
      </section>

      <section aria-labelledby="g-funil" className={CARD}>
        <Cabecalho id="g-funil" titulo="Funil da trilha">
          {dados.funis.length > 0 ? (
            <PixelSelect
              rotulo="TRILHA"
              rotuloAoLado
              className="w-full sm:w-auto sm:min-w-[220px]"
              value={funil?.slug ?? ""}
              onChange={onTrilha}
              opcoes={dados.funis.map((f) => ({
                valor: f.slug,
                rotulo: f.nome,
              }))}
            />
          ) : null}
        </Cabecalho>
        {funil ? (
          <Funil etapas={funil.etapas} />
        ) : (
          <p className={`${TIPO.corpo} m-0 text-ink-muted`}>
            Nenhuma trilha publicada ainda.
          </p>
        )}
      </section>

      <section aria-labelledby="g-seq" className={CARD}>
        <Cabecalho id="g-seq" titulo="Sequência dos alunos">
          <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
            ALUNOS EM CADA FAIXA
          </span>
        </Cabecalho>
        <GraficoFaixas
          faixas={dados.sequencias}
          rotulo={`Sequência de dias: ${dados.sequencias.map((f) => `${f.alunos} com ${f.faixa}`).join(", ")}.`}
        />
      </section>
    </div>
  );
}
