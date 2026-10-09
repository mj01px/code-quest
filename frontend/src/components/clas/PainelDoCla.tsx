"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import {
  LIMITE_MEMBROS,
  bandeira,
  ehGestor,
  formatarData,
  type AcaoDeMembro,
} from "@/lib/clas";
import type { Cargo, Cla, MembroDoCla, MeuCla } from "@/lib/types";

import { BTN_PRIMARIO } from "./estilos";
import {
  IconeCopiar,
  IconeElo,
  IconeLapis,
  IconeSetaEsquerda,
} from "./icones";
import { ListaDeMembros } from "./ListaDeMembros";
import { ModalConfirmacao } from "./ModalConfirmacao";
import { ModalConvite } from "./ModalConvite";
import { ModalEditarCla } from "./ModalEditarCla";

function mensagem(erro: unknown): string {
  return erro instanceof ErroApi
    ? erro.message
    : "Algo deu errado. Tente de novo.";
}

type Acao =
  | { tipo: "transferir"; membro: MembroDoCla }
  | { tipo: "expulsar"; membro: MembroDoCla }
  | { tipo: "sair" };

export function PainelDoCla({ tag }: { tag: string }) {
  const router = useRouter();
  const { usuario } = useProgresso();

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [cla, setCla] = useState<Cla | null>(null);
  const [membros, setMembros] = useState<MembroDoCla[]>([]);
  const [souMembro, setSouMembro] = useState(false);
  const [meuCargo, setMeuCargo] = useState<Cargo | null>(null);
  const [outroCla, setOutroCla] = useState<MeuCla | null>(null);
  const [maiorNivel, setMaiorNivel] = useState(0);
  const [versao, setVersao] = useState(0);

  const [entrando, setEntrando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [acao, setAcao] = useState<Acao | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [convidando, setConvidando] = useState(false);

  const alvo = tag.toUpperCase();

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.meuCla(),
      api.obterCla(tag).catch((erro) => {
        if (erro instanceof ErroApi && erro.naoEncontrado) return null;
        throw erro;
      }),
      api.membrosDoCla(tag).catch(() => [] as MembroDoCla[]),
      api.minhasCriaturas().catch(() => []),
    ])
      .then(([meu, detalhe, lista, criaturas]) => {
        if (!ativo) return;
        const sou = Boolean(meu && meu.cla.tag.toUpperCase() === alvo);
        setSouMembro(sou);
        setMeuCargo(sou && meu ? meu.cargo : null);
        setOutroCla(meu && !sou ? meu : null);
        setMaiorNivel(criaturas.reduce((m, c) => Math.max(m, c.nivel), 0));
        const claFinal = detalhe ?? (sou && meu ? meu.cla : null);
        if (claFinal) {
          setCla(claFinal);
          setNaoEncontrado(false);
        } else {
          setNaoEncontrado(true);
        }
        setMembros(lista);
      })
      .catch(() => {
        if (ativo) setNaoEncontrado(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [tag, alvo, versao]);

  function recarregar() {
    setVersao((v) => v + 1);
  }

  if (carregando) {
    return (
      <p className="rotulo text-ink-muted" aria-busy="true">
        Carregando...
      </p>
    );
  }

  if (naoEncontrado || !cla) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/clas"
          className="inline-flex items-center gap-2 self-start font-label text-[11px] tracking-[2px] text-brand-light"
        >
          <IconeSetaEsquerda size={14} /> CLÃS
        </Link>
        <section className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center">
          <p className="m-0 font-body text-base text-ink-muted">
            Clã não encontrado. Ele pode ter sido desfeito, ou é privado e você
            não é membro.
          </p>
        </section>
      </div>
    );
  }

  const info = bandeira(cla.bandeira);
  const cheio = cla.total_membros >= LIMITE_MEMBROS;
  const nivelOk = maiorNivel >= cla.nivel_minimo;
  const semOutroCla = outroCla === null;
  const podeEntrarPerm = usuario?.permissoes.includes("comunidades.join") ?? true;
  const podeEntrar =
    !cheio && nivelOk && semOutroCla && podeEntrarPerm && maiorNivel >= 5;
  const motivoBloqueio = !semOutroCla
    ? `Você já está em ${outroCla?.cla.nome}. Saia dele antes de entrar aqui.`
    : cheio
      ? "Este clã está cheio."
      : !nivelOk
        ? `Sua criatura precisa estar no nível ${cla.nivel_minimo} pra entrar.`
        : "Você não pode entrar em clãs agora.";
  const liderComTurma = meuCargo === "LIDER" && membros.length > 1;
  const sozinho = membros.length <= 1;

  async function copiarTag() {
    try {
      await navigator.clipboard.writeText(`#${cla!.tag}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  async function entrar() {
    setEntrando(true);
    setErroAcao(null);
    try {
      await api.entrarNoCla(cla!.tag);
      recarregar();
    } catch (erro) {
      setErroAcao(mensagem(erro));
    } finally {
      setEntrando(false);
    }
  }

  async function aoAgirSobreMembro(tipo: AcaoDeMembro, membro: MembroDoCla) {
    if (tipo === "transferir") {
      setErroModal(null);
      setAcao({ tipo: "transferir", membro });
      return;
    }
    if (tipo === "expulsar") {
      setErroModal(null);
      setAcao({ tipo: "expulsar", membro });
      return;
    }
    setBusyId(membro.id);
    setErroAcao(null);
    try {
      await api.mudarCargo(
        cla!.tag,
        membro.id,
        tipo === "promover" ? "COLIDER" : "MEMBRO",
      );
      recarregar();
    } catch (erro) {
      setErroAcao(mensagem(erro));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarAcao() {
    if (!acao) return;
    setProcessando(true);
    setErroModal(null);
    try {
      if (acao.tipo === "sair") {
        await api.sairDoCla();
        router.push("/clas");
        return;
      }
      if (acao.tipo === "transferir") {
        await api.transferirLideranca(cla!.tag, acao.membro.id);
      } else {
        await api.expulsarMembro(cla!.tag, acao.membro.id);
      }
      setAcao(null);
      recarregar();
    } catch (erro) {
      setErroModal(mensagem(erro));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/clas"
        className="inline-flex items-center gap-2 self-start font-label text-[11px] tracking-[2px] text-brand-light"
      >
        <IconeSetaEsquerda size={14} /> CLÃS
      </Link>

      <section
        aria-labelledby="nome-cla"
        className="relative flex flex-col border-[3px] border-brand bg-panel shadow-frame"
      >
        {souMembro && meuCargo && ehGestor(meuCargo) ? (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            {cla.tipo === "PRIVADO" ? (
              <button
                type="button"
                onClick={() => setConvidando(true)}
                aria-label="Link de convite"
                className="flex h-11 w-11 items-center justify-center border-2 border-brand-shadow bg-void/80 text-brand-light hover:border-brand"
              >
                <IconeElo size={18} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label="Editar clã"
              className="flex h-11 w-11 items-center justify-center border-2 border-brand-shadow bg-void/80 text-brand-light hover:border-brand"
            >
              <IconeLapis size={18} />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-7 border-b-2 border-edge bg-[#15101f] p-8">
          <span className="flex h-[120px] w-[120px] shrink-0 items-center justify-center border-2 border-brand-shadow bg-void shadow-[0_0_0_4px_rgba(168,85,247,0.22)]">
            <Image
              src={info.src}
              alt={`Bandeira de ${cla.nome}`}
              width={104}
              height={104}
              className="block h-[104px] w-[104px]"
            />
          </span>
          <div className="flex min-w-0 flex-1 basis-80 flex-col gap-3.5">
            <span className="self-start border-2 border-brand-shadow bg-void px-3 py-1.5 font-label text-[11px] tracking-[2px] text-brand-light">
              CLÃ {cla.tipo_rotulo.toUpperCase()} · {cla.total_membros}/
              {LIMITE_MEMBROS} MEMBROS
            </span>
            <h1
              id="nome-cla"
              className="titulo m-0 font-display text-2xl leading-[1.7] text-ink text-balance [text-shadow:2px_2px_0_var(--color-brand-dark)]"
            >
              {cla.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-label text-[12px] tracking-[2px] text-ink-body">
                #{cla.tag}
              </span>
              <button
                type="button"
                onClick={copiarTag}
                aria-label="Copiar tag"
                className="inline-flex items-center gap-1.5 border-2 border-edge-soft px-2 py-1 font-label text-[10px] tracking-[2px] text-ink-muted hover:text-ink-soft"
              >
                <IconeCopiar size={14} /> {copiado ? "COPIADO" : "COPIAR"}
              </button>
            </div>
          </div>
          {!souMembro && podeEntrar ? (
            <button
              type="button"
              onClick={entrar}
              disabled={entrando}
              className={BTN_PRIMARIO}
            >
              {entrando ? "ENTRANDO..." : "ENTRAR NO CLÃ"}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 bg-panel-deep px-8 py-5">
          <p className="m-0 flex-1 basis-80 font-body text-base leading-[1.6] text-ink-body">
            {cla.descricao || "Este clã ainda não tem descrição."}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center border-2 border-brand px-2.5 py-1 font-label text-[10px] tracking-[2px] text-brand-light uppercase">
              Nível mín. {cla.nivel_minimo}
            </span>
            <span className="inline-flex items-center border-2 border-edge-soft px-2.5 py-1 font-label text-[10px] tracking-[2px] text-ink-muted uppercase">
              Desde {formatarData(cla.criado_em)}
            </span>
          </div>
        </div>
      </section>

      {erroAcao ? (
        <p role="alert" className="m-0 font-body text-base text-danger">
          {erroAcao}
        </p>
      ) : null}

      {souMembro && meuCargo ? (
        <>
          <ListaDeMembros
            membros={membros}
            total={cla.total_membros}
            meuNickname={usuario?.nickname}
            meuCargo={meuCargo}
            busyId={busyId}
            onAcao={aoAgirSobreMembro}
          />

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              disabled={liderComTurma}
              onClick={() => {
                setErroModal(null);
                setAcao({ tipo: "sair" });
              }}
              title={liderComTurma ? "Passe a liderança antes de sair" : undefined}
              className="inline-flex items-center justify-center border-2 border-danger bg-transparent px-6 py-3.5 font-display text-[11px] leading-[1.7] tracking-[1px] text-danger shadow-pixel transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              SAIR DO CLÃ
            </button>
            <span className="flex-1 basis-72 font-body text-sm leading-[1.5] text-ink-muted">
              {liderComTurma
                ? "Você é o líder. Passe a liderança pra outro membro antes de sair."
                : sozinho
                  ? "Você é o último. Sair apaga o clã."
                  : "Pra voltar vai precisar entrar de novo."}
            </span>
          </div>
        </>
      ) : (
        <>
          {!podeEntrar ? (
            <p className="m-0 font-body text-sm leading-[1.5] text-ink-muted">
              {motivoBloqueio}
            </p>
          ) : null}
          <ListaDeMembros
            membros={membros}
            total={cla.total_membros}
            meuNickname={usuario?.nickname}
            meuCargo={null}
            busyId={busyId}
            onAcao={aoAgirSobreMembro}
          />
        </>
      )}

      {editando ? (
        <ModalEditarCla
          cla={cla}
          onFechar={() => setEditando(false)}
          onSalvo={() => {
            setEditando(false);
            recarregar();
          }}
        />
      ) : null}

      {convidando ? (
        <ModalConvite tag={cla.tag} onFechar={() => setConvidando(false)} />
      ) : null}

      {acao ? (
        <ModalConfirmacao
          rotulo={acao.tipo === "sair" ? "Sair do clã" : "Ação do líder"}
          titulo={
            acao.tipo === "sair"
              ? "Sair do clã?"
              : acao.tipo === "transferir"
                ? "Passar a liderança?"
                : "Expulsar membro?"
          }
          textoConfirmar={
            acao.tipo === "sair"
              ? "SAIR"
              : acao.tipo === "transferir"
                ? "PASSAR LIDERANÇA"
                : "EXPULSAR"
          }
          perigo={acao.tipo !== "transferir"}
          carregando={processando}
          erro={erroModal}
          onConfirmar={confirmarAcao}
          onFechar={() => {
            if (!processando) setAcao(null);
          }}
        >
          {acao.tipo === "sair" ? (
            sozinho ? (
              <p className="m-0">
                Você é o último membro de <strong>{cla.nome}</strong>. Sair vai
                apagar o clã pra sempre.
              </p>
            ) : (
              <p className="m-0">
                Você vai deixar <strong>{cla.nome}</strong>. Pra voltar vai
                precisar entrar de novo.
              </p>
            )
          ) : acao.tipo === "transferir" ? (
            <ul className="m-0 flex list-disc flex-col gap-2.5 pl-5">
              <li>
                <strong>{acao.membro.nickname}</strong> vira o novo líder.
              </li>
              <li>Você vira co-líder.</li>
              <li>Só o novo líder vai poder te passar a liderança de volta.</li>
            </ul>
          ) : (
            <p className="m-0">
              Tirar <strong>{acao.membro.nickname}</strong> do clã. A pessoa pode
              entrar de novo depois, se o clã permitir.
            </p>
          )}
        </ModalConfirmacao>
      ) : null}
    </div>
  );
}
