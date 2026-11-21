"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ModalAdmin } from "@/components/admin/ModalAdmin";
import { ConteudoLegal } from "@/components/legal/ConteudoLegal";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ServicoIndisponivel } from "@/components/ui/ServicoIndisponivel";
import { ErroApi, api } from "@/lib/api";
import type { DocumentoLegal, VersaoDeDocumento } from "@/lib/types";
import {
  DOCUMENTOS,
  formatarDia,
  hojeIso,
  proximaVersao,
  situacaoDoDocumento,
} from "@/lib/versoesDeDocumentos";

const PERMISSAO = "documentos.manage";
const DURACAO_AVISO_MS = 4000;

interface Rascunho {
  id: string | null;
  documento: DocumentoLegal;
  versao: string;
  vigente_desde: string;
  conteudo: string;
}

const BOTAO_PRIMARIO =
  "cursor-pointer border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50";
const BOTAO_SECUNDARIO =
  "cursor-pointer border-2 border-edge-soft bg-transparent px-3 py-1.5 font-label text-[9px] tracking-[1px] text-brand-light hover:border-brand hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-40";
const BOTAO_PERIGO =
  "cursor-pointer border-2 border-danger bg-transparent px-3 py-1.5 font-label text-[9px] tracking-[1px] text-danger hover:bg-danger hover:text-void disabled:cursor-not-allowed disabled:opacity-40";
const ROTULO_CAMPO = "font-label text-[10px] tracking-[2px] text-ink-label";
const CAMPO =
  "border-2 border-edge-soft bg-field px-3 py-2 font-body text-base tracking-[1px] text-ink";

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ErroApi ? erro.message : padrao;
}

export function GestaoDocumentosLegais() {
  const router = useRouter();
  const { usuario, carregando, erro: erroSessao } = useProgresso();
  const pode = usuario?.is_admin === true && usuario.permissoes.includes(PERMISSAO);

  const [versoes, setVersoes] = useState<VersaoDeDocumento[]>([]);
  const [carregandoVersoes, setCarregandoVersoes] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editor, setEditor] = useState<Rascunho | null>(null);
  const [previa, setPrevia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState<VersaoDeDocumento | null>(null);
  const [visualizando, setVisualizando] = useState<VersaoDeDocumento | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    if (carregando || erroSessao) return;
    if (!usuario) router.replace("/entrar");
    else if (!pode) router.replace(usuario.is_admin ? "/admin" : "/trilhas");
  }, [carregando, erroSessao, usuario, pode, router]);

  const recarregar = useCallback(async () => {
    try {
      setVersoes(await api.adminVersoesDeDocumentos());
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível carregar os documentos."));
    }
  }, []);

  useEffect(() => {
    if (!pode) return;
    let ativo = true;
    api
      .adminVersoesDeDocumentos()
      .then((lista) => {
        if (ativo) setVersoes(lista);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDe(e, "Não foi possível carregar os documentos."));
      })
      .finally(() => {
        if (ativo) setCarregandoVersoes(false);
      });
    return () => {
      ativo = false;
    };
  }, [pode]);

  useEffect(() => {
    if (!aviso) return;
    const sumir = setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
    return () => clearTimeout(sumir);
  }, [aviso]);

  function abrirNovo(documento: DocumentoLegal) {
    const { publicadas } = situacaoDoDocumento(versoes, documento);
    const base = publicadas[0] ?? null;
    setEditor({
      id: null,
      documento,
      versao: proximaVersao(base?.versao ?? null),
      vigente_desde: hojeIso(),
      conteudo: base?.conteudo ?? "## Primeira seção\n\n",
    });
    setPrevia(false);
    setErro(null);
  }

  function abrirEdicao(rascunho: VersaoDeDocumento) {
    setEditor({
      id: rascunho.id,
      documento: rascunho.documento,
      versao: rascunho.versao,
      vigente_desde: rascunho.vigente_desde,
      conteudo: rascunho.conteudo,
    });
    setPrevia(false);
    setErro(null);
  }

  async function salvar() {
    if (!editor) return;
    setSalvando(true);
    setErro(null);
    const { id, documento, ...campos } = editor;
    try {
      if (id) await api.adminAtualizarVersaoDeDocumento(id, campos);
      else await api.adminCriarVersaoDeDocumento({ documento, ...campos });
      setEditor(null);
      setAviso("Rascunho salvo.");
      await recarregar();
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível salvar o rascunho."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(rascunho: VersaoDeDocumento) {
    setOcupado(rascunho.id);
    setErro(null);
    try {
      await api.adminExcluirVersaoDeDocumento(rascunho.id);
      setAviso(`Rascunho da versão ${rascunho.versao} excluído.`);
      await recarregar();
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível excluir o rascunho."));
    } finally {
      setOcupado(null);
    }
  }

  async function publicar(rascunho: VersaoDeDocumento) {
    setOcupado(rascunho.id);
    setErro(null);
    try {
      const publicada = await api.adminPublicarVersaoDeDocumento(rascunho.id);
      setConfirmando(null);
      setAviso(
        `${publicada.rotulo} ${publicada.versao} publicada, vigente a partir de ${formatarDia(publicada.vigente_desde)}.`,
      );
      await recarregar();
    } catch (e) {
      setConfirmando(null);
      setErro(mensagemDe(e, "Não foi possível publicar a versão."));
    } finally {
      setOcupado(null);
    }
  }

  if (erroSessao && !usuario) return <ServicoIndisponivel />;
  if (carregando || !usuario || !pode) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-brand-light">
        &gt; VERIFICANDO ACESSO...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-3">
          <span className="font-label text-[11px] tracking-[2px] text-brand">
            {"// ADMIN"}
          </span>
          <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
            Documentos legais
          </h1>
          <p className="m-0 max-w-[70ch] font-body text-base leading-[1.6] tracking-wide text-ink-muted">
            Escreva uma nova versão dos Termos de Uso ou da Política de
            Privacidade como rascunho e publique quando estiver pronta. Uma
            versão publicada não pode mais ser editada nem excluída, e todos os
            usuários terão de aceitá-la a partir da data de vigência.
          </p>
        </div>
        <Link
          href="/admin"
          className="font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 hover:text-brand-light"
        >
          VOLTAR AO PAINEL
        </Link>
      </div>

      {erro && !editor ? <AlertaDeErro mensagem={erro} /> : null}

      {carregandoVersoes ? (
        <p className="font-label text-[12px] tracking-[2px] text-brand-light">
          &gt; CARREGANDO DOCUMENTOS...
        </p>
      ) : (
        DOCUMENTOS.map(({ documento, rotulo }) => {
          const situacao = situacaoDoDocumento(versoes, documento);
          const editando = editor?.documento === documento ? editor : null;
          return (
            <section
              key={documento}
              aria-labelledby={`documento-${documento}`}
              className="flex flex-col gap-5 border-2 border-edge bg-panel p-5 shadow-pixel sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <h2
                    id={`documento-${documento}`}
                    className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink"
                  >
                    {rotulo}
                  </h2>
                  <span className="font-label text-[9px] tracking-[1px] text-ink-muted">
                    {situacao.vigente
                      ? `VIGENTE: VERSÃO ${situacao.vigente.versao} DESDE ${formatarDia(situacao.vigente.vigente_desde)}`
                      : "SEM VERSÃO VIGENTE"}
                  </span>
                  {situacao.agendadas.map((agendada) => (
                    <span
                      key={agendada.id}
                      className="font-label text-[9px] tracking-[1px] text-success"
                    >
                      AGENDADA: VERSÃO {agendada.versao} A PARTIR DE{" "}
                      {formatarDia(agendada.vigente_desde)}
                    </span>
                  ))}
                </div>
                {!situacao.rascunho && !editando ? (
                  <button
                    type="button"
                    onClick={() => abrirNovo(documento)}
                    className={BOTAO_PRIMARIO}
                  >
                    + NOVA VERSÃO
                  </button>
                ) : null}
              </div>

              {editando ? (
                <EditorDeVersao
                  rascunho={editando}
                  erro={erro}
                  previa={previa}
                  salvando={salvando}
                  onMudar={setEditor}
                  onPrevia={setPrevia}
                  onSalvar={salvar}
                  onCancelar={() => setEditor(null)}
                />
              ) : situacao.rascunho ? (
                <CartaoDoRascunho
                  rascunho={situacao.rascunho}
                  ocupado={ocupado === situacao.rascunho.id}
                  confirmando={confirmando?.id === situacao.rascunho.id}
                  onEditar={abrirEdicao}
                  onVer={setVisualizando}
                  onExcluir={excluir}
                  onPedirPublicacao={setConfirmando}
                  onPublicar={publicar}
                  onDesistir={() => setConfirmando(null)}
                />
              ) : null}

              <div className="flex flex-col gap-2">
                <span className={ROTULO_CAMPO}>VERSÕES PUBLICADAS</span>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {situacao.publicadas.map((versao) => (
                    <li
                      key={versao.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-edge bg-panel-soft px-3 py-2.5"
                    >
                      <span className="flex flex-wrap items-center gap-3 font-body text-base tracking-[1px] text-ink-body">
                        <span className="text-ink">Versão {versao.versao}</span>
                        <span className="text-ink-muted">
                          {versao.vigente_desde > hojeIso() ? "agendada para" : "vigente desde"}{" "}
                          {formatarDia(versao.vigente_desde)}
                          {versao.publicado_por ? ` · publicada por ${versao.publicado_por}` : ""}
                        </span>
                        {versao.vigente ? (
                          <span className="border border-success px-2 py-1 font-label text-[8px] tracking-[1px] text-success">
                            VIGENTE
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisualizando(versao)}
                        className={BOTAO_SECUNDARIO}
                      >
                        VER TEXTO
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })
      )}

      {visualizando ? (
        <ModalAdmin
          rotulo="// DOCUMENTO"
          titulo={`${visualizando.rotulo} ${visualizando.versao}`}
          largura="larga"
          onFechar={() => setVisualizando(null)}
        >
          <div className="flex flex-col gap-6">
            <ConteudoLegal markdown={visualizando.conteudo} />
          </div>
        </ModalAdmin>
      ) : null}

      <p
        role="status"
        className={
          aviso
            ? "fixed right-4 bottom-4 z-50 m-0 border-[3px] border-success bg-panel px-5 py-4 font-body text-base tracking-[1px] text-ink shadow-[6px_6px_0_#000]"
            : "sr-only"
        }
      >
        {aviso}
      </p>
    </div>
  );
}

function AlertaDeErro({ mensagem }: { mensagem: string }) {
  return (
    <p
      role="alert"
      className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
    >
      {mensagem}
    </p>
  );
}

function EditorDeVersao({
  rascunho,
  erro,
  previa,
  salvando,
  onMudar,
  onPrevia,
  onSalvar,
  onCancelar,
}: {
  rascunho: Rascunho;
  erro: string | null;
  previa: boolean;
  salvando: boolean;
  onMudar: (rascunho: Rascunho) => void;
  onPrevia: (previa: boolean) => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  return (
    <fieldset className="flex flex-col gap-4 border-2 border-brand bg-panel-soft p-5">
      <legend className="px-2 font-label text-[11px] tracking-[2px] text-brand-light">
        {rascunho.id ? "EDITAR RASCUNHO" : "NOVA VERSÃO"}
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={ROTULO_CAMPO}>VERSÃO</span>
          <input
            type="text"
            value={rascunho.versao}
            onChange={(e) => onMudar({ ...rascunho, versao: e.target.value })}
            inputMode="decimal"
            placeholder="1.4"
            className={CAMPO}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={ROTULO_CAMPO}>VIGENTE A PARTIR DE</span>
          <input
            type="date"
            value={rascunho.vigente_desde}
            min={hojeIso()}
            onChange={(e) => onMudar({ ...rascunho, vigente_desde: e.target.value })}
            className={CAMPO}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={ROTULO_CAMPO}>TEXTO EM MARKDOWN</span>
          <div role="group" aria-label="Modo de exibição" className="flex gap-2">
            <button
              type="button"
              aria-pressed={!previa}
              onClick={() => onPrevia(false)}
              className={BOTAO_SECUNDARIO}
            >
              ESCREVER
            </button>
            <button
              type="button"
              aria-pressed={previa}
              onClick={() => onPrevia(true)}
              className={BOTAO_SECUNDARIO}
            >
              PRÉ-VISUALIZAR
            </button>
          </div>
        </div>
        {previa ? (
          <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto border-2 border-edge bg-panel p-4">
            <ConteudoLegal markdown={rascunho.conteudo} />
          </div>
        ) : (
          <>
            <textarea
              aria-label="Texto do documento"
              value={rascunho.conteudo}
              onChange={(e) => onMudar({ ...rascunho, conteudo: e.target.value })}
              rows={22}
              spellCheck
              className={`${CAMPO} min-h-[320px] font-terminal text-lg leading-[1.4]`}
            />
            <span className="font-body text-sm leading-[1.5] tracking-[1px] text-ink-dim">
              Cada seção começa com &quot;## Título&quot; e é numerada sozinha.
              Use **negrito**, listas com &quot;- &quot;, tabelas com &quot;|&quot;,
              destaque com &quot;&gt; &quot; e links como
              [Política de Privacidade](/privacidade).
            </span>
          </>
        )}
      </div>

      {erro ? <AlertaDeErro mensagem={erro} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSalvar} disabled={salvando} className={BOTAO_PRIMARIO}>
          {salvando ? "SALVANDO..." : "SALVAR RASCUNHO"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
        >
          CANCELAR
        </button>
      </div>
    </fieldset>
  );
}

function CartaoDoRascunho({
  rascunho,
  ocupado,
  confirmando,
  onEditar,
  onVer,
  onExcluir,
  onPedirPublicacao,
  onPublicar,
  onDesistir,
}: {
  rascunho: VersaoDeDocumento;
  ocupado: boolean;
  confirmando: boolean;
  onEditar: (rascunho: VersaoDeDocumento) => void;
  onVer: (rascunho: VersaoDeDocumento) => void;
  onExcluir: (rascunho: VersaoDeDocumento) => void;
  onPedirPublicacao: (rascunho: VersaoDeDocumento) => void;
  onPublicar: (rascunho: VersaoDeDocumento) => void;
  onDesistir: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-2 border-brand-shadow bg-panel-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-3 font-body text-base tracking-[1px] text-ink-body">
          <span className="border border-brand-strong px-2 py-1 font-label text-[8px] tracking-[1px] text-brand-light">
            RASCUNHO
          </span>
          <span className="text-ink">Versão {rascunho.versao}</span>
          <span className="text-ink-muted">
            vigente a partir de {formatarDia(rascunho.vigente_desde)}
          </span>
        </span>
        <span className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onVer(rascunho)} className={BOTAO_SECUNDARIO}>
            VER TEXTO
          </button>
          <button
            type="button"
            onClick={() => onEditar(rascunho)}
            disabled={ocupado}
            className={BOTAO_SECUNDARIO}
          >
            EDITAR
          </button>
          <button
            type="button"
            onClick={() => onExcluir(rascunho)}
            disabled={ocupado}
            className={BOTAO_PERIGO}
          >
            EXCLUIR
          </button>
          <button
            type="button"
            onClick={() => onPedirPublicacao(rascunho)}
            disabled={ocupado || confirmando}
            className={BOTAO_PRIMARIO}
          >
            PUBLICAR
          </button>
        </span>
      </div>

      {confirmando ? (
        <div
          role="alertdialog"
          aria-label={`Publicar a versão ${rascunho.versao}`}
          className="flex flex-col gap-3 border-2 border-danger-deep bg-panel p-4"
        >
          <p className="m-0 font-body text-base leading-[1.6] tracking-wide text-ink-body">
            Publicar a versão {rascunho.versao} de {rascunho.rotulo}? Depois de
            publicada ela não pode mais ser editada nem excluída, e todos os
            usuários terão de aceitá-la a partir de{" "}
            {formatarDia(rascunho.vigente_desde)}.
          </p>
          <span className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onPublicar(rascunho)}
              disabled={ocupado}
              className={BOTAO_PRIMARIO}
            >
              {ocupado ? "PUBLICANDO..." : "CONFIRMAR PUBLICAÇÃO"}
            </button>
            <button
              type="button"
              onClick={onDesistir}
              disabled={ocupado}
              className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
            >
              CANCELAR
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
