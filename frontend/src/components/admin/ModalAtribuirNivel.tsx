"use client";

import { useEffect, useState } from "react";

import { ModalAdmin } from "@/components/admin/ModalAdmin";
import { IconeLupa } from "@/components/clas/icones";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import type { NivelDeAcesso, UsuarioAdmin } from "@/lib/types";

const ESPERA_BUSCA_MS = 300;
const PROPRIO_NIVEL = "Você não pode alterar seu próprio nível";
const SEM_NIVEL = "Sem nível";

type Passo = 1 | 2 | 3;

const PASSOS: [Passo, string][] = [
  [1, "USUÁRIO"],
  [2, "NÍVEL"],
  [3, "CONFIRMAR"],
];

const BTN_PRIMARIO =
  "min-h-11 cursor-pointer border-2 border-brand-light bg-brand-strong px-5 font-label text-[11px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50";

const BTN_SECUNDARIO =
  "min-h-11 cursor-pointer border-2 border-edge-soft bg-transparent px-4 font-label text-[11px] tracking-[2px] text-ink-body hover:border-brand disabled:cursor-not-allowed disabled:opacity-50";

interface Props {
  onFechar: () => void;
  onAtribuido: (mensagem: string) => void;
  onExcluir: (usuario: UsuarioAdmin) => void;
}

export function ModalAtribuirNivel({ onFechar, onAtribuido, onExcluir }: Props) {
  const { usuario: eu } = useProgresso();
  const [passo, setPasso] = useState<Passo>(1);
  const [termo, setTermo] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [buscando, setBuscando] = useState(true);
  const [niveis, setNiveis] = useState<NivelDeAcesso[]>([]);
  const [escolhido, setEscolhido] = useState<UsuarioAdmin | null>(null);
  const [nivelId, setNivelId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmandoSituacao, setConfirmandoSituacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .adminNiveis()
      .then((ns) => {
        if (ativo) setNiveis(ns);
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar os níveis de acesso.");
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    const busca = termo.trim();
    const espera = setTimeout(
      async () => {
        try {
          const us = await api.adminUsuarios(busca);
          if (ativo) {
            setUsuarios(us);
            setErro(null);
          }
        } catch (e) {
          if (ativo) {
            setUsuarios([]);
            setErro(
              e instanceof ErroApi ? e.message : "Não foi possível carregar os usuários.",
            );
          }
        } finally {
          if (ativo) setBuscando(false);
        }
      },
      busca ? ESPERA_BUSCA_MS : 0,
    );
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [termo]);

  const nivelAtual = escolhido?.nivel?.id ?? "";
  const nomeDoNivel = (id: string) =>
    niveis.find((n) => n.id === id)?.nome ?? SEM_NIVEL;
  const novoNivel = niveis.find((n) => n.id === nivelId) ?? null;
  const ehDaEquipe = (u: UsuarioAdmin) =>
    niveis.some((n) => n.id === u.nivel?.id && n.acesso_admin);
  const podeSuspender = eu?.permissoes.includes("usuarios.suspend") ?? false;

  function escolher(u: UsuarioAdmin) {
    setEscolhido(u);
    setNivelId(u.nivel?.id ?? "");
    setConfirmandoSituacao(false);
  }

  async function aplicar() {
    if (!escolhido) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.adminAtribuirNivel(escolhido.id, nivelId || null);
      onAtribuido(
        `${escolhido.nickname}: ${escolhido.nivel?.nome ?? SEM_NIVEL} → ${nomeDoNivel(nivelId)}.`,
      );
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível trocar o nível.");
    } finally {
      setSalvando(false);
    }
  }

  // RF34: ação direta do passo 1, com confirmação simples; o backend encerra as
  // sessões ao suspender.
  async function alternarSituacao(alvo: UsuarioAdmin) {
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await api.adminSituacaoUsuario(alvo.id, !alvo.ativo);
      onAtribuido(
        `Conta de ${atualizado.nickname} ${atualizado.ativo ? "reativada" : "suspensa"}.`,
      );
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não foi possível alterar a situação.",
      );
    } finally {
      setSalvando(false);
    }
  }

  // No passo 1 quem avança é a ação escolhida no painel do usuário, não um PRÓXIMO.
  const rodape = (
    <div className="ml-auto flex flex-wrap gap-3">
      {passo === 1 ? (
        <button type="button" onClick={onFechar} className={BTN_SECUNDARIO}>
          CANCELAR
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPasso((p) => (p - 1) as Passo)}
          disabled={salvando}
          className={BTN_SECUNDARIO}
        >
          VOLTAR
        </button>
      )}
      {passo === 3 ? (
        <button
          type="button"
          onClick={aplicar}
          disabled={salvando}
          className={BTN_PRIMARIO}
        >
          {salvando ? "APLICANDO..." : "APLICAR"}
        </button>
      ) : passo === 2 ? (
        <button
          type="button"
          onClick={() => setPasso(3)}
          disabled={nivelId === nivelAtual}
          className={BTN_PRIMARIO}
        >
          PRÓXIMO
        </button>
      ) : null}
    </div>
  );

  return (
    <ModalAdmin
      rotulo="// ADMIN"
      titulo="Atribuir nível"
      bloqueado={salvando}
      rodape={rodape}
      onFechar={onFechar}
    >
      <div className="flex flex-col gap-5">
        <ol aria-label="Etapas" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {PASSOS.map(([numero, rotulo]) => (
            <li
              key={numero}
              aria-current={passo === numero ? "step" : undefined}
              className={`px-2.5 py-1 font-label text-[10px] tracking-[2px] ${
                passo === numero
                  ? "bg-brand-strong text-ink"
                  : "border-2 border-edge-soft text-ink-muted"
              }`}
            >
              {numero} · {rotulo}
            </li>
          ))}
        </ol>

        {erro ? (
          <p
            role="alert"
            className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] text-danger"
          >
            {erro}
          </p>
        ) : null}

        {passo === 1 ? (
          <>
            <label className="flex items-center gap-3 border-2 border-brand bg-field px-3 py-2 text-ink-muted focus-within:border-brand-light">
              <IconeLupa />
              <span className="sr-only">Buscar usuário</span>
              <input
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar por nickname, e-mail ou nível"
                className="min-h-9 w-full bg-transparent font-body text-base tracking-[1px] text-ink outline-none placeholder:text-ink-dim"
              />
            </label>

            {buscando ? (
              <p className="m-0 font-label text-[11px] tracking-[2px] text-brand-light">
                &gt; BUSCANDO...
              </p>
            ) : usuarios.length === 0 ? (
              <p className="m-0 font-body text-base text-ink-muted">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <ul
                aria-label="Usuários encontrados"
                className="m-0 flex list-none flex-col border-2 border-edge p-0"
              >
                {usuarios.map((u) => {
                  const souEu = u.id === eu?.id;
                  const marcado = escolhido?.id === u.id;
                  return (
                    <li key={u.id} className="border-b border-edge last:border-b-0">
                      <button
                        type="button"
                        onClick={() => escolher(u)}
                        disabled={souEu}
                        aria-pressed={marcado}
                        aria-describedby={souEu ? "dica-proprio-nivel" : undefined}
                        className={`flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                          marcado
                            ? "bg-brand-void outline-2 -outline-offset-2 outline-brand-light"
                            : "bg-transparent hover:bg-panel-soft"
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-body text-lg leading-tight text-ink">
                            {u.nickname}
                          </span>
                          <span className="truncate font-body text-sm tracking-[1px] text-ink-muted">
                            {u.email}
                          </span>
                          {u.ativo ? null : (
                            <span className="self-start border-2 border-danger-deep px-2 py-0.5 font-label text-[10px] tracking-[2px] text-danger">
                              {u.anonimizado ? "ANONIMIZADA" : "SUSPENSA"}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-label text-[10px] tracking-[1px] text-ink-body uppercase">
                          {u.nivel?.nome ?? SEM_NIVEL}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {usuarios.some((u) => u.id === eu?.id) ? (
              <p
                id="dica-proprio-nivel"
                className="m-0 font-body text-sm tracking-[1px] text-ink-muted"
              >
                {PROPRIO_NIVEL}
              </p>
            ) : null}

            {escolhido ? (
              <div
                role="group"
                aria-label={`Ações para ${escolhido.nickname}`}
                className="flex flex-col gap-3 border-2 border-edge bg-panel-soft p-4"
              >
                <span className="font-body text-base text-ink-body">
                  Ações para <strong className="text-ink">{escolhido.nickname}</strong>
                </span>
                {confirmandoSituacao ? (
                  <>
                    <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
                      {escolhido.ativo
                        ? `Suspender a conta de ${escolhido.nickname}? As sessões abertas são encerradas e ela só volta a entrar depois de reativada.`
                        : `Reativar a conta de ${escolhido.nickname}?`}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => alternarSituacao(escolhido)}
                        disabled={salvando}
                        className={BTN_PRIMARIO}
                      >
                        {salvando
                          ? "APLICANDO..."
                          : escolhido.ativo
                            ? "CONFIRMAR SUSPENSÃO"
                            : "CONFIRMAR REATIVAÇÃO"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoSituacao(false)}
                        disabled={salvando}
                        className={BTN_SECUNDARIO}
                      >
                        NÃO
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setPasso(2)}
                      className={BTN_PRIMARIO}
                    >
                      ATRIBUIR NÍVEL
                    </button>
                    {/* Contas da equipe sem suspender/excluir; o backend também recusa. */}
                    {!ehDaEquipe(escolhido) && podeSuspender && !escolhido.anonimizado ? (
                      <button
                        type="button"
                        onClick={() => setConfirmandoSituacao(true)}
                        className={BTN_SECUNDARIO}
                      >
                        {escolhido.ativo ? "SUSPENDER CONTA" : "REATIVAR CONTA"}
                      </button>
                    ) : null}
                    {!ehDaEquipe(escolhido) ? (
                      <button
                        type="button"
                        onClick={() => onExcluir(escolhido)}
                        className="min-h-11 cursor-pointer border-2 border-danger-deep bg-transparent px-4 font-label text-[11px] tracking-[2px] text-danger hover:border-danger"
                      >
                        EXCLUIR CONTA…
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}

        {passo === 2 && escolhido ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-3 font-body text-base text-ink-body">
              Novo nível de <strong className="text-ink">{escolhido.nickname}</strong>
            </legend>
            {[{ id: "", nome: SEM_NIVEL, acesso_admin: false }, ...niveis].map((n) => (
              <label
                key={n.id || "sem-nivel"}
                className={`flex min-h-12 cursor-pointer items-center gap-3 border-2 px-4 py-2 ${
                  nivelId === n.id ? "border-brand-light bg-brand-void" : "border-edge bg-panel-soft"
                }`}
              >
                <input
                  type="radio"
                  name="nivel"
                  value={n.id}
                  checked={nivelId === n.id}
                  onChange={() => setNivelId(n.id)}
                  className="accent-brand"
                />
                <span className="flex-1 font-body text-base text-ink">{n.nome}</span>
                {n.acesso_admin ? (
                  <span className="border border-success px-2 py-0.5 font-label text-[9px] tracking-[1px] text-success">
                    PAINEL
                  </span>
                ) : null}
                {n.id === nivelAtual ? (
                  <span className="font-label text-[9px] tracking-[1px] text-ink-muted">
                    ATUAL
                  </span>
                ) : null}
              </label>
            ))}
          </fieldset>
        ) : null}

        {passo === 3 && escolhido ? (
          <div className="flex flex-col gap-3 border-2 border-edge bg-panel-soft p-5">
            <span className="font-body text-lg text-ink">{escolhido.nickname}</span>
            <span className="font-body text-base text-ink-body">
              {/* Nome vindo do próprio usuário: se os níveis não carregarem, a
                  confirmação não pode mostrar "Sem nível" para quem tem nível. */}
              {escolhido.nivel?.nome ?? SEM_NIVEL} → <strong className="text-ink">{nomeDoNivel(nivelId)}</strong>
            </span>
            {novoNivel?.acesso_admin ? (
              <span className="font-body text-sm tracking-[1px] text-success">
                Vai ganhar acesso ao painel admin.
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalAdmin>
  );
}
