"use client";

import { useEffect, useMemo, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import type { NivelDeAcesso, PermissaoCatalogo } from "@/lib/types";

interface FormState {
  nome: string;
  descricao: string;
  acessoAdmin: boolean;
  sel: Set<string>;
}

const FORM_VAZIO: FormState = {
  nome: "",
  descricao: "",
  acessoAdmin: false,
  sel: new Set(),
};

export function GestaoNiveis() {
  const [niveis, setNiveis] = useState<NivelDeAcesso[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Editor: null fechado; "novo" cria; id edita um nível existente.
  const [editorId, setEditorId] = useState<string | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [ns, ps] = await Promise.all([
          api.adminNiveis(),
          api.adminPermissoes(),
        ]);
        if (!ativo) return;
        setNiveis(ns);
        setPermissoes(ps);
      } catch (e) {
        if (ativo) {
          setErro(
            e instanceof ErroApi
              ? e.message
              : "Não foi possível carregar os níveis.",
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Permissões agrupadas por módulo, para os checkboxes.
  const porModulo = useMemo(() => {
    const mapa = new Map<string, PermissaoCatalogo[]>();
    for (const p of permissoes) {
      const lista = mapa.get(p.modulo) ?? [];
      lista.push(p);
      mapa.set(p.modulo, lista);
    }
    return [...mapa.entries()];
  }, [permissoes]);

  // Nível sob edição (para saber se é de sistema: nesses o nome é imutável).
  const nivelEmEdicao =
    editorId && editorId !== "novo"
      ? niveis.find((n) => n.id === editorId)
      : undefined;
  const ehSistema = Boolean(nivelEmEdicao?.sistema);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, sel: new Set() });
    setEditorId("novo");
    setErro(null);
  }

  function abrirEdicao(nivel: NivelDeAcesso) {
    setForm({
      nome: nivel.nome,
      descricao: nivel.descricao,
      acessoAdmin: nivel.acesso_admin,
      sel: new Set(nivel.permissoes),
    });
    setEditorId(nivel.id);
    setErro(null);
  }

  function fechar() {
    setEditorId(null);
    setForm(FORM_VAZIO);
  }

  function alternar(codename: string) {
    setForm((f) => {
      const sel = new Set(f.sel);
      if (sel.has(codename)) sel.delete(codename);
      else sel.add(codename);
      return { ...f, sel };
    });
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro("Dê um nome ao nível.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const corpo = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      permissoes: [...form.sel],
      acesso_admin: form.acessoAdmin,
    };
    try {
      if (editorId === "novo") {
        const criado = await api.adminCriarNivel(corpo);
        setNiveis((atual) => [...atual, criado].sort(porNome));
      } else if (editorId) {
        const atualizado = await api.adminAtualizarNivel(editorId, corpo);
        setNiveis((atual) =>
          atual.map((n) => (n.id === atualizado.id ? atualizado : n)),
        );
      }
      fechar();
    } catch (e) {
      setErro(
        e instanceof ErroApi
          ? (e.porCampo().nome ?? e.message)
          : "Não foi possível salvar o nível.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(nivel: NivelDeAcesso) {
    setOcupado(nivel.id);
    setErro(null);
    try {
      await api.adminRemoverNivel(nivel.id);
      setNiveis((atual) => atual.filter((n) => n.id !== nivel.id));
      if (editorId === nivel.id) fechar();
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não foi possível excluir o nível.",
      );
    } finally {
      setOcupado(null);
    }
  }

  if (carregando) {
    return (
      <p className="font-label text-[12px] tracking-[2px] text-brand-light">
        &gt; CARREGANDO NÍVEIS...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {erro ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <span className="font-label text-[11px] tracking-[2px] text-ink-label">
          NÍVEIS DE ACESSO
        </span>
        <button
          type="button"
          onClick={abrirNovo}
          className="cursor-pointer border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong"
        >
          + NOVO NÍVEL
        </button>
      </div>

      {editorId !== null ? (
        <fieldset className="flex flex-col gap-4 border-2 border-brand bg-panel p-5 shadow-pixel">
          <legend className="px-2 font-label text-[11px] tracking-[2px] text-brand-light">
            {editorId === "novo" ? "NOVO NÍVEL" : "EDITAR NÍVEL"}
          </legend>

          <label className="flex flex-col gap-2">
            <span className="font-label text-[10px] tracking-[2px] text-ink-label">
              NOME
            </span>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              disabled={ehSistema}
              placeholder="aluno_sem_criatura"
              className="border-2 border-edge-soft bg-field px-3 py-2 font-body text-base tracking-[1px] text-ink disabled:cursor-not-allowed disabled:opacity-60"
            />
            {ehSistema ? (
              <span className="font-body text-sm tracking-[1px] text-ink-dim">
                Nível de sistema: o nome é fixo, mas você pode ajustar a
                descrição e as permissões.
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-label text-[10px] tracking-[2px] text-ink-label">
              DESCRIÇÃO
            </span>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              placeholder="Para que serve este nível"
              className="border-2 border-edge-soft bg-field px-3 py-2 font-body text-base tracking-[1px] text-ink"
            />
          </label>

          <label className="flex items-start gap-2 border-2 border-edge bg-panel-soft px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.acessoAdmin}
              onChange={(e) =>
                setForm((f) => ({ ...f, acessoAdmin: e.target.checked }))
              }
              disabled={ehSistema}
              className="mt-0.5 accent-brand disabled:opacity-60"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-label text-[10px] tracking-[1px] text-ink-label">
                CONCEDE ACESSO AO PAINEL ADMIN
              </span>
              <span className="font-body text-sm leading-[1.4] tracking-[1px] text-ink-dim">
                {ehSistema
                  ? "Fixo em níveis de sistema."
                  : "Quem estiver neste nível pode abrir o /admin."}
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3">
            <span className="font-label text-[10px] tracking-[2px] text-ink-label">
              PERMISSÕES
            </span>
            {porModulo.map(([modulo, lista]) => (
              <div key={modulo} className="flex flex-col gap-2">
                <span className="font-label text-[9px] tracking-[1px] text-ink-muted">
                  {modulo.toUpperCase()}
                </span>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {lista.map((p) => (
                    <label
                      key={p.codename}
                      className="flex cursor-pointer items-start gap-2 border border-edge bg-panel-soft px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={form.sel.has(p.codename)}
                        onChange={() => alternar(p.codename)}
                        className="mt-0.5 accent-brand"
                      />
                      <span className="font-body text-sm leading-[1.4] tracking-[1px] text-ink-body">
                        {p.rotulo}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="cursor-pointer border-2 border-brand-light bg-brand-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? "SALVANDO..." : "SALVAR"}
            </button>
            <button
              type="button"
              onClick={fechar}
              disabled={salvando}
              className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
            >
              CANCELAR
            </button>
          </div>
        </fieldset>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {niveis.map((n) => (
          <li
            key={n.id}
            className="flex flex-col gap-3 border-2 border-edge bg-panel p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="font-body text-xl leading-none text-ink">
                  {n.nome}
                </span>
                {n.sistema ? (
                  <span className="border border-brand-strong px-2 py-1 font-label text-[8px] tracking-[1px] text-brand-light">
                    SISTEMA
                  </span>
                ) : null}
                {n.acesso_admin ? (
                  <span className="border border-success px-2 py-1 font-label text-[8px] tracking-[1px] text-success">
                    PAINEL
                  </span>
                ) : null}
                <span className="font-label text-[9px] tracking-[1px] text-ink-muted">
                  {n.qtd_usuarios} USUÁRIO{n.qtd_usuarios === 1 ? "" : "S"}
                </span>
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => abrirEdicao(n)}
                  className="cursor-pointer border-2 border-edge-soft bg-transparent px-3 py-1.5 font-label text-[9px] tracking-[1px] text-brand-light hover:border-brand hover:text-ink-soft"
                >
                  EDITAR
                </button>
                {!n.sistema ? (
                  <button
                    type="button"
                    onClick={() => excluir(n)}
                    disabled={ocupado === n.id || n.qtd_usuarios > 0}
                    title={
                      n.qtd_usuarios > 0
                        ? "Reatribua os usuários antes de excluir"
                        : undefined
                    }
                    className="cursor-pointer border-2 border-danger bg-transparent px-3 py-1.5 font-label text-[9px] tracking-[1px] text-danger hover:bg-danger hover:text-void disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {ocupado === n.id ? "..." : "EXCLUIR"}
                  </button>
                ) : null}
              </span>
            </div>

            {n.descricao ? (
              <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
                {n.descricao}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function porNome(a: NivelDeAcesso, b: NivelDeAcesso): number {
  return a.nome.localeCompare(b.nome);
}
