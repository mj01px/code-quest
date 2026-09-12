"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { api } from "@/lib/api";

export const ITENS = [
  { rotulo: "TRILHAS", href: "/trilhas" },
  { rotulo: "DESAFIO DO DIA", href: "/desafios" },
  { rotulo: "CONFIGURAÇÕES", href: "/configuracoes" },
] as const;

const BLOCOS = 10;

/** O item da rota aberta, incluindo as rotas filhas dela. */
function estaAtivo(href: string, caminho: string | null): boolean {
  if (caminho === null) return false;
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function BarraLateral() {
  // Fora do roteador (nos testes) vem null, e nenhum item fica marcado.
  const caminho = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erroAoSair, setErroAoSair] = useState(false);
  // Os dados vêm do Context, não de busca própria: sem isso o bloco piscaria
  // a cada troca de rota. O provedor vive no layout do route group.
  const { usuario, criatura, progresso, carregando } = useProgresso();

  // Apesar do nome, `xp_para_o_proximo` NÃO é quanto falta: é o tamanho da
  // faixa do nível inteiro (xp do próximo menos xp do atual). Ou seja, ele já
  // é o denominador. Somá-lo a `xp_no_nivel` inflava o total a cada XP ganho,
  // e a barra andava menos do que devia.
  //
  // Null no topo da tabela, onde não há próximo nível: ali a barra fica cheia.
  const noTopo = progresso !== null && progresso.xp_para_o_proximo === null;
  const faixa = progresso?.xp_para_o_proximo ?? 0;
  const fracao = noTopo
    ? 1
    : progresso && faixa > 0
      ? progresso.xp_no_nivel / faixa
      : 0;
  const acesos = Math.round(fracao * BLOCOS);

  async function sair() {
    setSaindo(true);
    setErroAoSair(false);
    try {
      await api.sair();
    } catch {
      // O cookie de sessão é httpOnly: só o servidor o derruba. Mandar para
      // /entrar sem confirmação deixaria a sessão viva sem o aluno saber.
      setErroAoSair(true);
      setSaindo(false);
      return;
    }
    router.replace("/entrar");
  }

  return (
    <aside className="flex flex-col gap-8 border-b-[3px] border-edge bg-panel-deep px-5 py-6 lg:sticky lg:top-0 lg:h-dvh lg:w-[280px] lg:shrink-0 lg:overflow-y-auto lg:border-r-[3px] lg:border-b-0">
      {/* Vai para /trilhas, e não para a landing: dentro do app a raiz é a
          página pública, e cair nela parece ter sido deslogado. */}
      <Link
        href="/trilhas"
        aria-label="CodeQuest, início"
        className="self-center"
      >
        <Image
          src="/marca/logo.png"
          alt="CodeQuest"
          width={1705}
          height={189}
          priority
          className="block h-[18px] w-auto"
        />
      </Link>

      <div
        // Enquanto o número não chegou, o bloco existe com as mesmas dimensões
        // e invisível: nada de número inventado e nenhum salto de layout
        // quando o valor real entra.
        className={`flex flex-col gap-3 transition-opacity duration-150 ${
          carregando ? "opacity-0" : "opacity-100"
        }`}
        aria-busy={carregando}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel">
            {criatura?.sprite ? (
              <Image
                src={criatura.sprite}
                alt=""
                width={52}
                height={52}
                className="animate-bob block h-[52px] w-[52px]"
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="titulo truncate font-display text-[12px] leading-[1.5] text-ink">
              {usuario?.nickname ?? "Visitante"}
            </span>
            <span className="truncate font-body text-base tracking-[1px] text-ink-muted">
              {criatura?.criatura.nome ?? "Sem pet"}
            </span>
            <span className="font-label text-[11px] tracking-[2px] text-brand-light">
              NÍVEL {progresso?.nivel.numero ?? 1}
            </span>
          </div>
        </div>

        <div
          className="flex gap-[2px] border-2 border-edge-soft bg-void p-[2px]"
          role="progressbar"
          aria-valuenow={Math.round(fracao * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={
            noTopo
              ? "Nível máximo alcançado"
              : `Progresso para o nível ${(progresso?.nivel.numero ?? 1) + 1}`
          }
        >
          {Array.from({ length: BLOCOS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 ${i < acesos ? "bg-brand-strong" : "bg-[#1c1826]"}`}
            />
          ))}
        </div>

        <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
          {progresso === null
            ? "0 / 0 XP"
            : noTopo
              ? `${progresso.xp_total} XP`
              : `${progresso.xp_no_nivel} / ${faixa} XP`}
        </span>
      </div>

      <nav aria-label="Navegação principal">
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:flex lg:flex-col">
          {ITENS.map((item) => {
            const ativo = estaAtivo(item.href, caminho);

            return (
              <li key={item.rotulo}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center gap-3 border-2 p-3 font-label text-[12px] tracking-[2px] ${
                    ativo
                      ? "border-brand-light bg-brand-deep text-ink shadow-pixel"
                      : "border-edge text-ink-body hover:border-brand hover:text-ink-soft"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 ${ativo ? "bg-ink" : "bg-brand-shadow"}`}
                  />
                  <span className="truncate">{item.rotulo}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="flex w-full cursor-pointer items-center justify-center border-2 border-edge bg-transparent p-3 font-label text-[12px] tracking-[2px] text-ink-body hover:border-brand hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate">{saindo ? "SAINDO..." : "SAIR"}</span>
        </button>

        {erroAoSair ? (
          <span
            role="alert"
            className="font-body text-base leading-[1.4] tracking-[1px] text-danger"
          >
            Não foi possível sair agora. Tente de novo.
          </span>
        ) : null}
      </div>
    </aside>
  );
}
