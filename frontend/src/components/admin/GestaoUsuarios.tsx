"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IconeLixeira, IconeLupa } from "@/components/clas/icones";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import type { NivelDeAcesso, UsuarioAdmin } from "@/lib/types";

// Espera a digitação parar antes de buscar: uma requisição por termo, não por tecla.
const ESPERA_BUSCA_MS = 300;
const DURACAO_AVISO_MS = 4000;
const PROPRIO_NIVEL = "Você não pode alterar seu próprio nível";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function GestaoUsuarios() {
  const { usuario: eu } = useProgresso();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [niveis, setNiveis] = useState<NivelDeAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [excluir, setExcluir] = useState<UsuarioAdmin | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [codigo2fa, setCodigo2fa] = useState("");
  // null enquanto consulta. Lido ao abrir o modal: o admin pode ter acabado
  // de ativar o autenticador em outra aba.
  const [temApp, setTemApp] = useState<boolean | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Linha da equipe: nível com acesso ao painel. O backend recusa excluí-la.
  const ehAdmin = (u: UsuarioAdmin) =>
    niveis.some((n) => n.id === u.nivel?.id && n.acesso_admin);
  const podeSuspender = eu?.permissoes.includes("usuarios.suspend") ?? false;

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
            // Sem isto a tabela mostraria o resultado do termo anterior.
            setUsuarios([]);
            setErro(
              e instanceof ErroApi
                ? e.message
                : "Não foi possível carregar os usuários.",
            );
          }
        } finally {
          if (ativo) setCarregando(false);
        }
      },
      busca ? ESPERA_BUSCA_MS : 0,
    );
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [termo, recarga]);

  useEffect(() => {
    if (!aviso) return;
    const sumir = setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
    return () => clearTimeout(sumir);
  }, [aviso]);

  async function trocarNivel(usuario: UsuarioAdmin, nivelId: string) {
    setOcupado(usuario.id);
    setErro(null);
    try {
      const atualizado = await api.adminAtribuirNivel(
        usuario.id,
        nivelId || null,
      );
      setUsuarios((atual) =>
        atual.map((u) => (u.id === atualizado.id ? atualizado : u)),
      );
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não foi possível trocar o nível.",
      );
    } finally {
      setOcupado(null);
    }
  }

  // RF34: reversível, então sem modal; o backend encerra as sessões ao suspender.
  async function alternarSituacao(usuario: UsuarioAdmin) {
    setOcupado(usuario.id);
    setErro(null);
    try {
      const atualizado = await api.adminSituacaoUsuario(usuario.id, !usuario.ativo);
      setUsuarios((atual) =>
        atual.map((u) => (u.id === atualizado.id ? atualizado : u)),
      );
      setAviso(
        `Conta de ${atualizado.nickname} ${atualizado.ativo ? "reativada" : "suspensa"}.`,
      );
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não foi possível alterar a situação.",
      );
    } finally {
      setOcupado(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await api.adminExcluirUsuario(excluir.id, codigo2fa.trim());
      setAviso(`Dados de ${excluir.nickname} anonimizados.`);
      setExcluir(null);
      setCodigo2fa("");
      setRecarga((n) => n + 1);
    } catch (e) {
      // Código errado não serve de novo: o campo volta vazio para o próximo.
      setCodigo2fa("");
      setErroExclusao(
        e instanceof ErroApi ? e.message : "Não foi possível excluir agora.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <p className="font-label text-[12px] tracking-[2px] text-brand-light">
        &gt; CARREGANDO USUÁRIOS...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {erro ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}

      <label className="flex items-center gap-3 border-2 border-edge-soft bg-field px-3 py-2 text-ink-muted focus-within:border-brand-light">
        <IconeLupa />
        <span className="sr-only">Buscar usuários</span>
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar por nickname, e-mail ou nível"
          className="w-full bg-transparent font-body text-base tracking-[1px] text-ink outline-none placeholder:text-ink-dim"
        />
      </label>

      <div className="overflow-x-auto border-2 border-edge bg-panel shadow-pixel">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-edge">
              {["Usuário", "Cadastro", "Nível de acesso", "Ações"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-label text-[10px] tracking-[2px] text-ink-label"
                >
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center font-body text-base tracking-[1px] text-ink-muted"
                >
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-edge last:border-b-0">
                <td className="px-4 py-3 align-top">
                  <span className="block font-body text-lg leading-tight text-ink">
                    {u.nickname}
                  </span>
                  <span className="block font-body text-sm tracking-[1px] text-ink-muted">
                    {u.email}
                  </span>
                  {u.ativo ? null : (
                    <span className="mt-1 inline-block border-2 border-danger-deep px-2 py-0.5 font-label text-[10px] tracking-[2px] text-danger">
                      {u.anonimizado ? "ANONIMIZADA" : "SUSPENSA"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top font-body text-base tracking-[1px] text-ink-muted">
                  {formatarData(u.criado_em)}
                </td>
                <td
                  className="px-4 py-3 align-top"
                  // No <td>: select desabilitado não mostra o title na maioria dos navegadores.
                  title={u.id === eu?.id ? PROPRIO_NIVEL : undefined}
                >
                  <select
                    aria-label={`Nível de acesso de ${u.nickname}`}
                    aria-describedby={u.id === eu?.id ? "dica-proprio-nivel" : undefined}
                    value={u.nivel?.id ?? ""}
                    disabled={ocupado === u.id || u.id === eu?.id}
                    onChange={(e) => trocarNivel(u, e.target.value)}
                    className="cursor-pointer border-2 border-edge-soft bg-field px-3 py-2 font-body text-base tracking-[1px] text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Sem nível</option>
                    {niveis.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nome}
                      </option>
                    ))}
                  </select>
                  {/* Visível também: o title não aparece no teclado nem no toque. */}
                  {u.id === eu?.id ? (
                    <span
                      id="dica-proprio-nivel"
                      className="mt-1 block font-body text-sm tracking-[1px] text-ink-dim"
                    >
                      {PROPRIO_NIVEL}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  {/* Própria conta e contas da equipe sem ações; o backend também recusa. */}
                  {u.id === eu?.id || ehAdmin(u) ? null : (
                    <div className="flex gap-2">
                      {podeSuspender && !u.anonimizado ? (
                        <button
                          type="button"
                          disabled={ocupado === u.id}
                          onClick={() => alternarSituacao(u)}
                          className={`h-11 cursor-pointer border-2 px-3 font-label text-[10px] tracking-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            u.ativo
                              ? "border-edge-soft text-ink-muted hover:border-danger hover:text-danger"
                              : "border-success text-success hover:opacity-80"
                          }`}
                        >
                          {u.ativo ? "SUSPENDER" : "REATIVAR"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Excluir ${u.nickname}`}
                        onClick={() => {
                          setErroExclusao(null);
                          setCodigo2fa("");
                          setTemApp(null);
                          setExcluir(u);
                          api
                            .mfaStatus()
                            .then((s) => setTemApp(s.ativo && s.metodo === "APP"))
                            // Na dúvida mostra o campo: quem decide é o backend.
                            .catch(() => setTemApp(true));
                        }}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-edge-soft text-ink-muted transition-colors hover:border-danger hover:text-danger"
                      >
                        <IconeLixeira />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="m-0 font-body text-base leading-[1.5] tracking-[1px] text-ink-dim">
        O nível de acesso define as permissões de cada usuário. Um nível com
        acesso ao painel torna quem o tem administrador.
      </p>

      {excluir ? (
        <ModalConfirmacao
          rotulo="Excluir usuário"
          titulo={`Excluir ${excluir.nickname}?`}
          textoConfirmar="ANONIMIZAR"
          perigo
          carregando={excluindo}
          confirmarDesabilitado={!temApp || !codigo2fa.trim()}
          erro={erroExclusao}
          onConfirmar={confirmarExclusao}
          onFechar={() => {
            setExcluir(null);
            setCodigo2fa("");
          }}
        >
          <p className="m-0">
            Atenção: para conformidade com a LGPD, esta ação anonimizará os
            dados pessoais do usuário, mantendo apenas o histórico de progresso.
            Deseja continuar?
          </p>
          {temApp === null ? (
            <p className="m-0 mt-5 font-label text-[11px] tracking-[2px] text-ink-muted">
              VERIFICANDO SEU 2FA...
            </p>
          ) : temApp ? (
            <label className="mt-5 flex flex-col gap-2">
              <span className="font-label text-[11px] tracking-[2px] text-ink-label">
                CÓDIGO DO AUTENTICADOR (2FA)
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={Boolean(erroExclusao)}
                value={codigo2fa}
                // Sem maxLength: ele cortaria "123 456" colado antes de tirar o espaço.
                onChange={(e) =>
                  setCodigo2fa(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="border-2 border-edge-soft bg-field px-3 py-2 font-body text-lg tracking-[4px] text-ink outline-none focus:border-brand-light"
              />
            </label>
          ) : (
            // O backend recusa (mfa_necessario): avisar antes poupa digitar à toa.
            <p
              role="note"
              className="m-0 mt-5 border-2 border-danger-deep bg-panel-soft px-4 py-3 text-danger"
            >
              Ações destrutivas exigem o aplicativo autenticador. Em{" "}
              <Link href="/configuracoes" className="underline underline-offset-4">
                Configurações
              </Link>
              , ative a verificação em duas etapas pelo aplicativo (se hoje ela
              usa e-mail, desative antes e ative de novo escolhendo o app).
            </p>
          )}
        </ModalConfirmacao>
      ) : null}

      {/* Sempre montado: leitor de tela só anuncia mudança em região que já existe. */}
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
