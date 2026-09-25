"use client";

import { useEffect, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import type { NivelDeAcesso, UsuarioAdmin } from "@/lib/types";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [niveis, setNiveis] = useState<NivelDeAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [us, ns] = await Promise.all([
          api.adminUsuarios(),
          api.adminNiveis(),
        ]);
        if (!ativo) return;
        setUsuarios(us);
        setNiveis(ns);
      } catch (e) {
        if (ativo) {
          setErro(
            e instanceof ErroApi
              ? e.message
              : "Não foi possível carregar os usuários.",
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

      <div className="overflow-x-auto border-2 border-edge bg-panel shadow-pixel">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-edge">
              {["Usuário", "Cadastro", "Nível de acesso"].map((h) => (
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
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-edge last:border-b-0">
                <td className="px-4 py-3 align-top">
                  <span className="block font-body text-lg leading-tight text-ink">
                    {u.nickname}
                  </span>
                  <span className="block font-body text-sm tracking-[1px] text-ink-muted">
                    {u.email}
                  </span>
                </td>
                <td className="px-4 py-3 align-top font-body text-base tracking-[1px] text-ink-muted">
                  {formatarData(u.criado_em)}
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    aria-label={`Nível de acesso de ${u.nickname}`}
                    value={u.nivel?.id ?? ""}
                    disabled={ocupado === u.id}
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
    </div>
  );
}
