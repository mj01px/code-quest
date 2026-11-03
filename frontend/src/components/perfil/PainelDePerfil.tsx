"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { IconeConquista } from "@/components/conquistas/IconeConquista";
import { ErroApi, api } from "@/lib/api";
import { formatarData } from "@/lib/clas";
import type { PerfilPublico } from "@/lib/types";

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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="font-label text-[11px] tracking-[2px] text-brand">{"// PERFIL"}</span>
        <h1 className="titulo m-0 break-all font-display text-xl leading-[1.7] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
          {carga.tipo === "pronto" ? carga.perfil.nickname : nickname}
        </h1>
      </header>

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

function Perfil({ perfil }: { perfil: PerfilPublico }) {
  return (
    <>
      <section
        aria-label="Criatura e progresso"
        className="flex flex-wrap items-center gap-6 border-4 border-edge-soft bg-panel p-6 shadow-[6px_6px_0_#000]"
      >
        <span className="flex h-28 w-28 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep">
          {perfil.criatura?.sprite ? (
            <Image src={perfil.criatura.sprite} alt="" width={72} height={72} className="block" />
          ) : null}
        </span>
        <dl className="m-0 grid flex-1 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4">
          <Dado rotulo="Criatura" valor={perfil.criatura?.nome ?? "Nenhuma"} />
          <Dado rotulo="Nível" valor={perfil.nivel === null ? "-" : String(perfil.nivel)} />
          <Dado rotulo="XP" valor={`${perfil.xp_total} XP`} />
        </dl>
      </section>

      <section aria-labelledby="titulo-conquistas-perfil" className="flex flex-col gap-4">
        <h2
          id="titulo-conquistas-perfil"
          className="m-0 font-label text-[12px] tracking-[2px] text-brand-light uppercase"
        >
          Conquistas ({perfil.conquistas.length})
        </h2>
        {perfil.conquistas.length === 0 ? (
          <p className="m-0 font-body text-base text-ink-muted">
            Nenhuma conquista desbloqueada ainda.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
            {perfil.conquistas.map((conquista) => (
              <li
                key={conquista.slug}
                className="flex items-start gap-4 border-2 border-edge-soft bg-panel px-4 py-3"
              >
                <IconeConquista icone={conquista.icone} className="h-8 w-8 shrink-0 text-success" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-label text-[12px] tracking-[1px] text-ink uppercase">
                    {conquista.nome}
                  </span>
                  <span className="font-body text-base text-ink-body">{conquista.descricao}</span>
                  <span className="font-label text-[10px] tracking-[1px] text-ink-muted">
                    {formatarData(conquista.desbloqueada_em)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-label text-[10px] tracking-[2px] text-ink-muted uppercase">{rotulo}</dt>
      <dd className="m-0 font-display text-[14px] leading-[1.6] text-ink">{valor}</dd>
    </div>
  );
}
