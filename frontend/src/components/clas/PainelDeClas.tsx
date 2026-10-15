"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import { LIMITE_MEMBROS, NIVEL_MINIMO_GLOBAL, bandeira } from "@/lib/clas";
import type { Cla, Pagina } from "@/lib/types";

import { BTN_PRIMARIO, BTN_SECUNDARIO } from "./estilos";
import { IconeCadeado, IconeLupa, IconeSetaDireita, IconeSetaEsquerda } from "./icones";

const POR_PAGINA = 20;

function mensagem(erro: unknown): string {
  return erro instanceof ErroApi
    ? erro.message
    : "Algo deu errado. Tente de novo.";
}

type Estado = "verificando" | "redirecionando" | "pronto" | "erro";

export function PainelDeClas() {
  const router = useRouter();
  const { usuario } = useProgresso();

  const [estado, setEstado] = useState<Estado>("verificando");
  const [maiorNivel, setMaiorNivel] = useState(0);

  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);

  const [dados, setDados] = useState<Pagina<Cla> | null>(null);
  const [listaErro, setListaErro] = useState<string | null>(null);

  const [entrandoEm, setEntrandoEm] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.meuCla(), api.minhasCriaturas()])
      .then(([meu, criaturas]) => {
        if (!ativo) return;
        if (meu) {
          setEstado("redirecionando");
          router.replace(`/clas/${meu.cla.tag}`);
          return;
        }
        setMaiorNivel(criaturas.reduce((m, c) => Math.max(m, c.nivel), 0));
        setEstado("pronto");
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, [router]);

  useEffect(() => {
    if (estado !== "pronto") return;
    let ativo = true;
    api
      .listarClas({ busca: buscaAplicada, pagina })
      .then((resposta) => {
        if (!ativo) return;
        setDados(resposta);
        setListaErro(null);
      })
      .catch((erro) => {
        if (ativo) setListaErro(mensagem(erro));
      });
    return () => {
      ativo = false;
    };
  }, [estado, buscaAplicada, pagina]);

  if (estado === "verificando" || estado === "redirecionando") {
    return (
      <p className="rotulo text-ink-muted" aria-busy="true">
        Carregando...
      </p>
    );
  }

  if (estado === "erro") {
    return (
      <section className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center">
        <p className="font-body text-base text-ink-muted">
          Não foi possível carregar os clãs agora. Recarregue a página.
        </p>
      </section>
    );
  }

  const bloqueado = maiorNivel < NIVEL_MINIMO_GLOBAL;
  const podeCriar = usuario?.permissoes.includes("comunidades.create") ?? true;
  const total = dados?.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const clas = dados?.results ?? [];
  const carregandoLista = dados === null && listaErro === null;

  async function entrar(tag: string) {
    setEntrandoEm(tag);
    setErroAcao(null);
    try {
      await api.entrarNoCla(tag);
      router.push(`/clas/${tag}`);
    } catch (erro) {
      setErroAcao(mensagem(erro));
      setEntrandoEm(null);
    }
  }

  function aoBuscar(evento: React.FormEvent) {
    evento.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-xl flex-col gap-3">
          <span className="rotulo text-brand-light">Comunidade</span>
          <h1 className="titulo m-0 font-display text-xl leading-[1.7] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
            Clãs
          </h1>
          <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
            Encontre um clã público pra estudar junto, ou funde o seu e chame a
            turma.
          </p>
        </div>
        {!bloqueado && podeCriar ? (
          <Link href="/clas/criar" className={BTN_PRIMARIO}>
            CRIAR CLÃ
          </Link>
        ) : null}
      </header>

      {bloqueado ? (
        <div className="flex flex-wrap items-center gap-4 border-2 border-danger bg-panel-deep px-5 py-4">
          <span className="flex text-danger">
            <IconeCadeado size={16} />
          </span>
          <span className="flex-1 font-body text-base leading-[1.6] text-ink-body">
            Sua criatura precisa chegar ao{" "}
            <strong className="text-ink">nível {NIVEL_MINIMO_GLOBAL}</strong> pra
            criar ou entrar em um clã. Continue nas trilhas pra evoluir.
          </span>
          <Link href="/trilhas" className={BTN_SECUNDARIO}>
            IR PRAS TRILHAS
          </Link>
        </div>
      ) : null}

      <section className="flex flex-col gap-4" aria-labelledby="titulo-busca">
        <form className="flex flex-wrap items-end gap-4" onSubmit={aoBuscar}>
          <div className="flex flex-1 basis-80 flex-col gap-2">
            <label
              id="titulo-busca"
              htmlFor="busca"
              className="font-label text-[12px] tracking-[2px] text-ink-label"
            >
              BUSCAR CLÃ
            </label>
            <div className="flex items-center gap-2 border-2 border-brand-strong bg-field px-3 shadow-pixel">
              <span className="flex text-brand">
                <IconeLupa size={18} />
              </span>
              <input
                id="busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                maxLength={50}
                placeholder="Nome do clã ou #TAG"
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 font-body text-[15px] text-ink outline-none"
              />
            </div>
          </div>
          <button type="submit" className={BTN_SECUNDARIO}>
            BUSCAR
          </button>
        </form>

        <p className="rotulo m-0 text-ink-muted">
          {total} {total === 1 ? "clã público" : "clãs públicos"} · mais membros
          primeiro
        </p>

        {erroAcao ? (
          <p role="alert" className="m-0 font-body text-base text-danger">
            {erroAcao}
          </p>
        ) : null}

        {listaErro ? (
          <p role="alert" className="m-0 font-body text-base text-danger">
            {listaErro}
          </p>
        ) : carregandoLista ? (
          <p className="rotulo text-ink-muted" aria-busy="true">
            Carregando clãs...
          </p>
        ) : clas.length === 0 ? (
          <div className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center">
            <p className="m-0 font-body text-base text-ink-muted">
              {buscaAplicada
                ? `Nenhum clã público encontrado para "${buscaAplicada}".`
                : "Ainda não há clãs públicos. Que tal fundar o primeiro?"}
            </p>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0.5 border-2 border-edge bg-edge p-0 shadow-pixel-lg">
            {clas.map((cla) => (
              <LinhaDeCla
                key={cla.tag}
                cla={cla}
                maiorNivel={maiorNivel}
                bloqueado={bloqueado}
                entrando={entrandoEm === cla.tag}
                ocupado={entrandoEm !== null}
                onEntrar={() => entrar(cla.tag)}
              />
            ))}
          </ul>
        )}

        {totalPaginas > 1 ? (
          <nav
            aria-label="Paginação"
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <button
              type="button"
              className={BTN_SECUNDARIO}
              disabled={!dados?.previous || carregandoLista}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              <IconeSetaEsquerda size={14} /> ANTERIOR
            </button>
            <span className="font-label text-[11px] tracking-[2px] text-ink-body">
              PÁGINA {pagina} DE {totalPaginas}
            </span>
            <button
              type="button"
              className={BTN_SECUNDARIO}
              disabled={!dados?.next || carregandoLista}
              onClick={() => setPagina((p) => p + 1)}
            >
              PRÓXIMA <IconeSetaDireita size={14} />
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

function LinhaDeCla({
  cla,
  maiorNivel,
  bloqueado,
  entrando,
  ocupado,
  onEntrar,
}: {
  cla: Cla;
  maiorNivel: number;
  bloqueado: boolean;
  entrando: boolean;
  ocupado: boolean;
  onEntrar: () => void;
}) {
  const info = bandeira(cla.bandeira);
  const cheio = cla.total_membros >= LIMITE_MEMBROS;
  const nivelOk = !bloqueado && maiorNivel >= cla.nivel_minimo;
  const preenchidos = Math.round((cla.total_membros / LIMITE_MEMBROS) * 10);

  return (
    <li className="flex flex-wrap items-center gap-5 bg-panel px-5 py-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-brand-shadow bg-void">
        <Image
          src={info.src}
          alt={`Bandeira de ${cla.nome}`}
          width={44}
          height={44}
          className="block h-11 w-11"
        />
      </span>

      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-3">
          <Link
            href={`/clas/${cla.tag}`}
            className="font-label text-[13px] tracking-[2px] text-ink hover:text-brand-light"
          >
            {cla.nome.toUpperCase()}
          </Link>
          <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
            #{cla.tag}
          </span>
        </div>
        {cla.descricao ? (
          <span className="truncate font-body text-[15px] leading-[1.5] text-ink-muted">
            {cla.descricao}
          </span>
        ) : null}
      </div>

      <div className="flex w-[120px] shrink-0 flex-col gap-1.5">
        <span className="font-label text-[11px] tracking-[2px] text-ink-body">
          {cla.total_membros}/{LIMITE_MEMBROS}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex gap-0.5 self-start border border-edge-soft bg-void p-[3px]"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 ${i < preenchidos ? "bg-brand-strong" : "bg-[#1c1826]"}`}
            />
          ))}
        </span>
      </div>

      <div className="w-[76px] shrink-0">
        <span
          className={`inline-flex items-center border-2 px-2.5 py-1 font-label text-[10px] tracking-[2px] uppercase ${
            !nivelOk && !cheio
              ? "border-danger text-danger"
              : "border-edge-soft text-ink-muted"
          }`}
        >
          NV {cla.nivel_minimo}
        </span>
      </div>

      <div className="shrink-0">
        {cheio ? (
          <button type="button" disabled className={BTN_SECUNDARIO}>
            CHEIO
          </button>
        ) : !nivelOk ? (
          <button
            type="button"
            disabled
            className={BTN_SECUNDARIO}
            title={`Precisa de nível ${cla.nivel_minimo}`}
          >
            <IconeCadeado size={14} /> NV {cla.nivel_minimo}
          </button>
        ) : (
          <button
            type="button"
            className={BTN_SECUNDARIO}
            disabled={ocupado}
            onClick={onEntrar}
          >
            {entrando ? "ENTRANDO..." : "ENTRAR"}
          </button>
        )}
      </div>
    </li>
  );
}
