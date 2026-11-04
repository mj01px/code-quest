"use client";

import { useState } from "react";

import type { EtapaDoFunil } from "@/lib/types";

export const COR_SERIE = "#a855f7";
export const COR_APROVADA = "#4fc98a";
export const COR_REJEITADA = "#f87171";

const LARGURA = 520;
const ALTURA = 200;
const TOPO = 36;
const BASE = 170;
const ESQUERDA = 36;
const DIREITA = 512;
const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function dataLocal(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function diaCurto(iso: string): string {
  return dataLocal(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function diaDaSemana(iso: string): string {
  return SEMANA[dataLocal(iso).getDay()];
}

function escala(maximo: number): number[] {
  const topo = Math.max(4, Math.ceil(maximo / 4) * 4);
  return [topo, (topo * 2) / 4, topo / 4];
}

function Grade({ marcas, topo }: { marcas: number[]; topo: number }) {
  return (
    <>
      {marcas.map((m) => {
        const y = BASE - ((BASE - TOPO) * m) / topo;
        return (
          <g key={m}>
            <line
              x1={ESQUERDA}
              x2={DIREITA}
              y1={y}
              y2={y}
              stroke="#24202e"
              strokeWidth={1}
            />
            <text
              x={ESQUERDA - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-ink-muted font-label text-[10px]"
            >
              {m}
            </text>
          </g>
        );
      })}
      <line
        x1={ESQUERDA}
        x2={DIREITA}
        y1={BASE}
        y2={BASE}
        stroke="#3b3350"
        strokeWidth={1}
      />
    </>
  );
}

function Dica({ x, y, texto }: { x: number; y: number; texto: string }) {
  const largura = Math.max(60, texto.length * 7 + 16);
  const esquerda = Math.min(
    Math.max(x - largura / 2, ESQUERDA),
    DIREITA - largura,
  );
  return (
    <g pointerEvents="none">
      <rect
        x={esquerda}
        y={Math.max(y - 34, 2)}
        width={largura}
        height={22}
        fill="#0e0e14"
        stroke="#3b3350"
        strokeWidth={2}
      />
      <text
        x={esquerda + largura / 2}
        y={Math.max(y - 34, 2) + 15}
        textAnchor="middle"
        className="fill-ink font-label text-[11px]"
      >
        {texto}
      </text>
    </g>
  );
}

function RotulosDoEixo({
  datas,
  centro,
}: {
  datas: string[];
  centro: (i: number) => number;
}) {
  if (datas.length <= 7) {
    return (
      <>
        {datas.map((d, i) => (
          <text
            key={d}
            x={centro(i)}
            y={ALTURA - 8}
            textAnchor="middle"
            className="fill-ink-muted font-label text-[10px]"
          >
            {diaDaSemana(d)}
          </text>
        ))}
      </>
    );
  }
  return (
    <>
      <text
        x={ESQUERDA}
        y={ALTURA - 8}
        className="fill-ink-muted font-label text-[10px]"
      >
        {diaCurto(datas[0])}
      </text>
      <text
        x={DIREITA}
        y={ALTURA - 8}
        textAnchor="end"
        className="fill-ink-muted font-label text-[10px]"
      >
        {diaCurto(datas[datas.length - 1])}
      </text>
    </>
  );
}

export function GraficoLinha({
  pontos,
  rotulo,
}: {
  pontos: { data: string; valor: number }[];
  rotulo: string;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const marcas = escala(Math.max(0, ...pontos.map((p) => p.valor)));
  const topo = marcas[0];
  const passo =
    pontos.length > 1 ? (DIREITA - 12 - ESQUERDA) / (pontos.length - 1) : 0;
  const x = (i: number) => ESQUERDA + i * passo;
  const y = (v: number) => BASE - ((BASE - TOPO) * v) / topo;
  const linha = pontos
    .map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.valor)}`)
    .join(" ");
  const ultimo = pontos.length - 1;
  const ativo = foco ?? ultimo;

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={rotulo}
      className="block h-auto w-full"
      onMouseLeave={() => setFoco(null)}
    >
      <Grade marcas={marcas} topo={topo} />
      {pontos.length > 0 ? (
        <>
          <path
            d={`${linha} L${x(ultimo)} ${BASE} L${ESQUERDA} ${BASE} Z`}
            fill={COR_SERIE}
            fillOpacity={0.14}
          />
          <path d={linha} fill="none" stroke={COR_SERIE} strokeWidth={2} />
          {foco !== null ? (
            <line
              x1={x(foco)}
              x2={x(foco)}
              y1={TOPO}
              y2={BASE}
              stroke="#3b3350"
              strokeWidth={1}
            />
          ) : null}
          <circle
            cx={x(ativo)}
            cy={y(pontos[ativo].valor)}
            r={5}
            fill={COR_SERIE}
            stroke="#101016"
            strokeWidth={2}
          />
          <Dica
            x={x(ativo)}
            y={y(pontos[ativo].valor)}
            texto={`${pontos[ativo].valor} · ${ativo === ultimo && foco === null ? "HOJE" : diaCurto(pontos[ativo].data)}`}
          />
          {pontos.map((p, i) => (
            <rect
              key={p.data}
              x={x(i) - Math.max(passo, 8) / 2}
              y={TOPO}
              width={Math.max(passo, 8)}
              height={BASE - TOPO}
              fill="transparent"
              onMouseEnter={() => setFoco(i)}
            />
          ))}
        </>
      ) : null}
      <RotulosDoEixo datas={pontos.map((p) => p.data)} centro={x} />
    </svg>
  );
}

export function GraficoSubmissoes({
  dias,
  rotulo,
}: {
  dias: { data: string; aprovadas: number; rejeitadas: number }[];
  rotulo: string;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const marcas = escala(
    Math.max(0, ...dias.map((d) => d.aprovadas + d.rejeitadas)),
  );
  const topo = marcas[0];
  const coluna = (DIREITA - ESQUERDA) / Math.max(dias.length, 1);
  const largura = Math.max(coluna * 0.5, 3);
  const centro = (i: number) => ESQUERDA + i * coluna + coluna / 2;
  const altura = (v: number) => ((BASE - TOPO) * v) / topo;

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={rotulo}
      className="block h-auto w-full"
      onMouseLeave={() => setFoco(null)}
    >
      <Grade marcas={marcas} topo={topo} />
      {dias.map((d, i) => {
        const hA = altura(d.aprovadas);
        const hR = altura(d.rejeitadas);
        const xi = centro(i) - largura / 2;
        return (
          <g
            key={d.data}
            onMouseEnter={() => setFoco(i)}
            opacity={foco === null || foco === i ? 1 : 0.5}
          >
            <rect
              x={ESQUERDA + i * coluna}
              y={TOPO}
              width={coluna}
              height={BASE - TOPO}
              fill="transparent"
            />
            {hA > 0 ? (
              <rect
                x={xi}
                y={BASE - hA}
                width={largura}
                height={hA}
                fill={COR_APROVADA}
              />
            ) : null}
            {hR > 0 ? (
              <rect
                x={xi}
                y={BASE - hA - hR - (hA > 0 ? 2 : 0)}
                width={largura}
                height={hR}
                fill={COR_REJEITADA}
              />
            ) : null}
          </g>
        );
      })}
      {foco !== null ? (
        <Dica
          x={centro(foco)}
          y={BASE - altura(dias[foco].aprovadas + dias[foco].rejeitadas)}
          texto={`${diaCurto(dias[foco].data)} · ${dias[foco].aprovadas} OK · ${dias[foco].rejeitadas} ERRO`}
        />
      ) : null}
      <RotulosDoEixo datas={dias.map((d) => d.data)} centro={centro} />
    </svg>
  );
}

export function GraficoFaixas({
  faixas,
  rotulo,
}: {
  faixas: { faixa: string; alunos: number }[];
  rotulo: string;
}) {
  const topo = Math.max(1, ...faixas.map((f) => f.alunos));
  const coluna = (DIREITA - 20) / Math.max(faixas.length, 1);
  const largura = Math.min(70, coluna * 0.6);

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={rotulo}
      className="block h-auto w-full"
    >
      <line
        x1={20}
        x2={DIREITA}
        y1={BASE}
        y2={BASE}
        stroke="#3b3350"
        strokeWidth={1}
      />
      {faixas.map((f, i) => {
        const centro = 20 + i * coluna + coluna / 2;
        const h = ((BASE - TOPO) * f.alunos) / topo;
        return (
          <g key={f.faixa}>
            <title>{`${f.faixa}: ${f.alunos} alunos`}</title>
            {h > 0 ? (
              <rect
                x={centro - largura / 2}
                y={BASE - h}
                width={largura}
                height={h}
                fill={COR_SERIE}
              />
            ) : null}
            <text
              x={centro}
              y={BASE - h - 10}
              textAnchor="middle"
              className="fill-ink font-label text-[11px]"
            >
              {f.alunos}
            </text>
            <text
              x={centro}
              y={ALTURA - 8}
              textAnchor="middle"
              className="fill-ink-muted font-label text-[10px]"
            >
              {f.faixa.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function queda(anterior: number, atual: number): number {
  return anterior ? Math.round(((anterior - atual) * 100) / anterior) : 0;
}

export function Funil({ etapas }: { etapas: EtapaDoFunil[] }) {
  const base = Math.max(1, etapas[0]?.alunos ?? 0);
  const quedas = etapas
    .slice(1)
    .map((e, i) => ({ i: i + 1, valor: queda(etapas[i].alunos, e.alunos) }));
  const pior = quedas.reduce<{ i: number; valor: number } | null>(
    (maior, q) =>
      q.valor > 0 && (!maior || q.valor > maior.valor) ? q : maior,
    null,
  );

  return (
    <>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {etapas.map((etapa, i) => {
          const perda = i > 0 ? queda(etapas[i - 1].alunos, etapa.alunos) : 0;
          return (
            <li
              key={etapa.chave}
              className="grid grid-cols-[110px_minmax(0,1fr)_80px] items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)_92px]"
            >
              <span className="font-label text-[11px] tracking-[1px] text-ink-body uppercase">
                {etapa.rotulo}
              </span>
              <span className="block h-[18px] bg-panel-deep">
                <span
                  className="block h-full"
                  style={{
                    width: `${(etapa.alunos * 100) / base}%`,
                    background: COR_SERIE,
                  }}
                />
              </span>
              <span className="text-right font-label text-[11px] text-ink">
                {etapa.alunos}
                {perda > 0 ? (
                  <span className="ml-1.5 text-danger">−{perda}%</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {pior ? (
        <p className="m-0 font-terminal text-[19px] text-ink-muted">
          &gt; maior queda: de {etapas[pior.i - 1].rotulo.toLowerCase()} para{" "}
          {etapas[pior.i].rotulo.toLowerCase()}
        </p>
      ) : null}
    </>
  );
}
