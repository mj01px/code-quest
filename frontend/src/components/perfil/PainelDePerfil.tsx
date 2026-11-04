"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BLOCO, NOME } from "@/components/conquistas/estilos";
import { IconeConquista } from "@/components/conquistas/IconeConquista";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { IconeCadeado } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import { formatarData } from "@/lib/clas";
import { plural } from "@/lib/derivados";
import type { PerfilPublico } from "@/lib/types";

const VITRINE = 8;

type Carga =
  | { tipo: "carregando" }
  | { tipo: "nao-encontrado" }
  | { tipo: "erro" }
  | { tipo: "pronto"; perfil: PerfilPublico };

export function PainelDePerfil({ nickname }: { nickname: string }) {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .perfilPublico(nickname)
      .then((perfil) => {
        if (ativo) setCarga({ tipo: "pronto", perfil });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        const sumiu = erro instanceof ErroApi && erro.naoEncontrado;
        setCarga({ tipo: sumiu ? "nao-encontrado" : "erro" });
      });
    return () => {
      ativo = false;
    };
  }, [nickname]);

  return (
    <div className="flex flex-col gap-10">
      <span className="font-label text-[11px] tracking-[2px] text-brand">
        {"// PERFIL"}
      </span>

      {carga.tipo === "carregando" ? (
        <p className="rotulo text-ink-muted" aria-busy="true">
          Carregando...
        </p>
      ) : null}

      {carga.tipo === "nao-encontrado" || carga.tipo === "erro" ? (
        <section
          role="alert"
          className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center"
        >
          <p className="font-body text-base text-ink-muted">
            {carga.tipo === "nao-encontrado"
              ? "Nenhum codificador com esse nickname."
              : "Não foi possível carregar o perfil agora. Recarregue a página."}
          </p>
        </section>
      ) : null}

      {carga.tipo === "pronto" ? <Perfil perfil={carga.perfil} /> : null}
    </div>
  );
}

function membroDesde(iso: string | undefined): string | null {
  if (!iso) return null;
  const data = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function Perfil({ perfil }: { perfil: PerfilPublico }) {
  const { usuario } = useProgresso();
  const proprio = usuario?.nickname === perfil.nickname;
  const bloqueadas = perfil.conquistas_bloqueadas ?? [];
  const total =
    perfil.total_conquistas ?? perfil.conquistas.length + bloqueadas.length;
  const trilhas = perfil.trilhas ?? [];
  const faixa = perfil.xp_para_o_proximo ?? null;
  const noNivel = perfil.xp_no_nivel ?? 0;
  const percentualDoNivel = faixa
    ? Math.min(100, (noNivel / faixa) * 100)
    : 100;
  const desde = membroDesde(perfil.membro_desde);
  const vitrine = [
    ...perfil.conquistas.map((c) => ({
      ...c,
      estado: "desbloqueada" as const,
    })),
    ...bloqueadas.map((c) => ({
      ...c,
      descricao: "",
      desbloqueada_em: "",
      estado: c.oculta ? ("oculta" as const) : ("bloqueada" as const),
    })),
  ].slice(0, VITRINE);

  return (
    <>
      <section
        aria-label="Resumo do codificador"
        className="flex flex-wrap items-center gap-8 border-[3px] border-brand bg-panel p-6 shadow-frame sm:p-8"
      >
        <div className="relative flex h-44 w-44 shrink-0 items-center justify-center border-4 border-brand-light bg-panel-deep bg-[radial-gradient(#1d1a29_2px,transparent_2px)] bg-[size:16px_16px] shadow-[0_6px_0_var(--color-brand-void)]">
          {perfil.criatura?.sprite ? (
            <Image
              src={perfil.criatura.sprite}
              alt={perfil.criatura.nome}
              width={144}
              height={144}
              className="block h-36 w-36"
            />
          ) : (
            <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
              Sem pet
            </span>
          )}
          {perfil.nivel !== null ? (
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 border-[3px] border-void bg-brand-deep px-3 py-1.5 font-display text-[10px] whitespace-nowrap text-ink">
              NV {perfil.nivel}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <h1 className="titulo m-0 font-display text-[20px] leading-[1.5] break-all text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[26px]">
            {perfil.nickname}
          </h1>
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-2 font-label text-[11px] tracking-[2px] uppercase">
            {perfil.titulo_do_nivel ? (
              <span className="border-2 border-brand-shadow bg-brand-void px-2.5 py-1 text-brand-mist">
                {perfil.titulo_do_nivel}
              </span>
            ) : null}
            {perfil.criatura ? (
              <span className="text-ink-muted">{perfil.criatura.nome}</span>
            ) : null}
            {desde ? (
              <span className="text-ink-muted">· Membro desde {desde}</span>
            ) : null}
            {perfil.cla ? (
              <span className="text-ink-muted">· Clã {perfil.cla}</span>
            ) : null}
          </p>
          {perfil.nivel !== null ? (
            <div className="flex max-w-[520px] flex-col gap-2">
              <BarraSegmentada
                valor={percentualDoNivel}
                segmentos={10}
                expandida
                alta
                rotulo={
                  faixa
                    ? `Progresso para o nível ${perfil.nivel + 1}`
                    : "Nível máximo"
                }
              />
            </div>
          ) : null}
        </div>

        <dl
          aria-label="Criatura e progresso"
          className="m-0 grid flex-[1_1_300px] grid-cols-2 gap-3"
        >
          <Numero rotulo="XP total" valor={`${perfil.xp_total} XP`} />
          <Numero
            rotulo="Sequência"
            valor={plural(perfil.sequencia_atual ?? 0, "dia", "dias")}
            destaque="text-warning"
            icone={<IconeConquista icone="chama" className="h-4 w-4" />}
          />
          <Numero
            rotulo="Recorde"
            valor={plural(perfil.sequencia_recorde ?? 0, "dia", "dias")}
          />
          <Numero
            rotulo="Conquistas"
            valor={
              <>
                {perfil.conquistas.length}
                <span className="text-ink-dim">/{total}</span>
              </>
            }
            destaque="text-success"
          />
        </dl>
      </section>

      <section aria-labelledby="vitrine" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="vitrine"
            className="m-0 font-display text-[14px] leading-[1.6] tracking-[1px] text-ink"
          >
            Vitrine de conquistas
          </h2>
          {proprio ? (
            <Link
              href="/conquistas"
              className="font-label text-[11px] tracking-[2px] text-brand-light uppercase hover:text-brand-mist"
            >
              Ver todas &gt;
            </Link>
          ) : null}
        </div>
        {vitrine.length === 0 ? (
          <p className="m-0 font-body text-base text-ink-muted">
            Nenhuma conquista ainda.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-7 border-2 border-edge bg-void bg-[radial-gradient(#1d1a29_2px,transparent_2px)] bg-[size:32px_32px] px-6 py-7">
            {vitrine.map((conquista) => (
              <li
                key={conquista.slug}
                className="flex flex-col items-center gap-3"
              >
                <span
                  className={`relative flex h-[84px] w-[84px] items-center justify-center ${BLOCO[conquista.estado]}`}
                >
                  {conquista.estado === "bloqueada" ? (
                    <IconeCadeado className="h-9 w-9" />
                  ) : (
                    <IconeConquista
                      icone={
                        conquista.estado === "oculta"
                          ? "oculta"
                          : conquista.icone
                      }
                      className="h-11 w-11"
                    />
                  )}
                  {conquista.estado === "desbloqueada" ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2.5 -right-2.5 flex h-[22px] w-[22px] items-center justify-center border-[3px] border-void bg-success"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="var(--color-void)"
                        strokeWidth="3"
                      >
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    </span>
                  ) : null}
                </span>
                <span
                  className={`text-center font-label text-[11px] leading-[1.35] tracking-[1px] uppercase ${NOME[conquista.estado]}`}
                >
                  {conquista.nome}
                </span>
                <span className="font-label text-[9px] tracking-[1px] text-ink-dim uppercase">
                  {conquista.estado === "desbloqueada"
                    ? formatarData(conquista.desbloqueada_em)
                    : conquista.estado === "oculta"
                      ? "Secreta"
                      : "Bloqueada"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="trilhas-perfil" className="flex flex-col gap-4">
        <h2
          id="trilhas-perfil"
          className="m-0 font-display text-[14px] leading-[1.6] tracking-[1px] text-ink"
        >
          Trilhas em andamento
        </h2>
        {trilhas.length === 0 ? (
          <p className="m-0 font-body text-base text-ink-muted">
            Nenhuma trilha começada ainda.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {trilhas.map((trilha) => (
              <li
                key={trilha.slug}
                className="flex items-center gap-4 border-2 border-edge bg-panel px-[18px] py-4"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[10px] text-brand-light"
                >
                  {trilha.nome.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="truncate font-label text-[12px] tracking-[1px] text-ink uppercase">
                    {trilha.nome}
                  </span>
                  <BarraSegmentada
                    valor={trilha.percentual}
                    segmentos={10}
                    expandida
                    compacta
                    semMoldura
                    rotulo={`Progresso em ${trilha.nome}`}
                  />
                </div>
                <span className="font-label text-[11px] text-brand-light">
                  {trilha.percentual}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Numero({
  rotulo,
  valor,
  destaque = "text-ink",
  icone,
}: {
  rotulo: string;
  valor: React.ReactNode;
  destaque?: string;
  icone?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-2 border-edge bg-panel-deep p-4">
      <dt className="font-label text-[10px] tracking-[2px] text-ink-muted uppercase">
        {rotulo}
      </dt>
      <dd
        className={`m-0 flex items-center gap-2 font-display text-[14px] leading-[1.4] ${destaque}`}
      >
        {icone}
        {valor}
      </dd>
    </div>
  );
}
