"use client";

import Image from "next/image";
import { useState } from "react";
import { TelaDeEvolucao } from "@/components/gamificacao/TelaDeEvolucao";
import { ErroApi, api } from "@/lib/api";
import type { Criatura, Evolucao, MinhaCriatura } from "@/lib/types";

interface Props {
  criaturas: MinhaCriatura[];
  recarregar: () => Promise<void>;
}

const MAX = 3;

/** O que dizer sobre a evolução desta criatura, e se o botão está liberado.
 *
 * O servidor já resolve `pode_evoluir` e `nivel_para_evoluir` olhando o nível
 * DESTA criatura, então a tela não recalcula a regra: ela só a apresenta.
 */
function dicaEvolucao(posse: MinhaCriatura): {
  texto: string;
  pronto: boolean;
  maximo: boolean;
} {
  if (posse.proximo_estagio === null) {
    return { texto: "> forma final alcançada", pronto: false, maximo: true };
  }

  if (posse.pode_evoluir) {
    return {
      texto: "> pronto para evoluir",
      pronto: true,
      maximo: false,
    };
  }

  const alvo = posse.nivel_para_evoluir;
  if (alvo === null) {
    return { texto: "> evolução em breve", pronto: false, maximo: false };
  }

  return { texto: `> evolui no nível ${alvo}`, pronto: false, maximo: false };
}

export function SecaoCompanheiro({ criaturas, recarregar }: Props) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loja, setLoja] = useState(false);
  const [catalogo, setCatalogo] = useState<Criatura[] | null>(null);
  const [carregandoLoja, setCarregandoLoja] = useState(false);
  // A transição a exibir. Só existe entre o POST e o "Continuar".
  const [evolucao, setEvolucao] = useState<{
    nome: string;
    antes: string | null;
    depois: string | null;
    estagioAntes: number;
    estagioDepois: number;
  } | null>(null);

  const possuidos = new Set(criaturas.map((c) => c.criatura.slug));

  async function tornarPrincipal(slug: string) {
    setOcupado(slug);
    setErro(null);
    try {
      await api.definirCriaturaAtiva(slug);
      await recarregar();
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não deu para trocar agora.");
    } finally {
      setOcupado(null);
    }
  }

  async function evoluir(posse: MinhaCriatura) {
    setOcupado(posse.criatura.slug);
    setErro(null);

    // O sprite de onde a criatura sai precisa ser guardado antes do pedido: a
    // resposta só traz o da forma nova.
    const antes = posse.sprite;

    let resultado: Evolucao;
    try {
      resultado = await api.evoluirCriatura(posse.criatura.slug);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não deu para evoluir agora.");
      setOcupado(null);
      return;
    }

    if (resultado.evoluiu) {
      setEvolucao({
        nome: posse.criatura.nome,
        antes,
        depois: resultado.criatura.sprite,
        estagioAntes: resultado.estagio_anterior,
        estagioDepois: resultado.criatura.estagio_atual,
      });
    }

    // A lista relê de qualquer jeito: se outro pedido evoluiu primeiro, não há
    // animação a mostrar, mas a forma nova precisa aparecer na tela.
    await recarregar();
    setOcupado(null);
  }

  async function abrirLoja() {
    setErro(null);
    setLoja(true);
    if (catalogo === null) {
      setCarregandoLoja(true);
      try {
        setCatalogo(await api.catalogo());
      } catch (e) {
        setErro(
          e instanceof ErroApi
            ? e.message
            : "Não deu para carregar o catálogo.",
        );
      } finally {
        setCarregandoLoja(false);
      }
    }
  }

  async function adquirir(slug: string) {
    setOcupado(slug);
    setErro(null);
    try {
      await api.adquirirCriatura(slug);
      await recarregar();
      setLoja(false);
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não deu para adicionar agora.",
      );
    } finally {
      setOcupado(null);
    }
  }

  const disponiveis = (catalogo ?? []).filter(
    (c) => c.disponivel && !possuidos.has(c.slug),
  );
  const cheio = criaturas.length >= MAX;
  const rosterLinha = `${criaturas.length} ${
    criaturas.length === 1 ? "PET NA EQUIPE" : "PETS NA EQUIPE"
  } · MÁX ${MAX}`;

  return (
    <section className="flex w-full max-w-[640px] flex-col gap-4">
      <h2 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
        Companheiro
      </h2>
      <p className="m-0 font-body text-lg leading-[1.6] tracking-[1px] text-ink-muted">
        O primeiro da lista é o principal e recebe todo o XP das fases.
      </p>

      {criaturas.length === 0 ? (
        <p className="m-0 font-body text-lg tracking-[1px] text-ink-body">
          Você ainda não tem nenhuma criatura.
        </p>
      ) : (
        <div className="flex flex-col gap-[2px] border-2 border-edge bg-edge shadow-pixel-lg">
          {criaturas.map((posse) => {
            const principal = posse.ativa;
            const estagio = posse.criatura.estagios.find(
              (e) => e.estagio === posse.estagio_atual,
            );
            const evo = dicaEvolucao(posse);
            const meta = [
              posse.criatura.dominio_rotulo,
              `Nível ${posse.nivel}`,
              estagio ? estagio.rotulo : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={posse.id}
                className={`flex flex-wrap items-center gap-4 bg-panel p-4 ${
                  principal ? "border-l-4 border-brand" : ""
                }`}
              >
                <span
                  className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep ${
                    principal
                      ? "shadow-[0_0_0_3px_rgba(168,85,247,0.24),0_0_0_6px_rgba(168,85,247,0.10)]"
                      : ""
                  }`}
                >
                  {posse.sprite ? (
                    <Image
                      src={posse.sprite}
                      alt=""
                      width={48}
                      height={48}
                      className="block h-[48px] w-[48px]"
                    />
                  ) : null}
                </span>

                <span className="flex min-w-[180px] flex-[1_1_220px] flex-col gap-1.5">
                  <span className="font-display text-[12px] leading-[1.6] text-ink">
                    {posse.criatura.nome}
                  </span>
                  <span className="font-body text-base tracking-[1px] text-ink-muted">
                    {meta}
                  </span>
                  <span
                    className={`font-body text-base tracking-[1px] ${
                      evo.pronto ? "text-[#7de3c3]" : "text-ink-dim"
                    }`}
                  >
                    {evo.texto}
                  </span>
                </span>

                <span className="flex shrink-0 flex-wrap gap-2">
                  {principal ? null : (
                    <button
                      type="button"
                      onClick={() => tornarPrincipal(posse.criatura.slug)}
                      disabled={ocupado !== null}
                      className="cursor-pointer border-2 border-edge-soft bg-transparent px-4 py-2.5 font-label text-[10px] tracking-[2px] text-ink-muted shadow-pixel hover:border-brand hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ocupado === posse.criatura.slug
                        ? "..."
                        : "TORNAR PRINCIPAL"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => evoluir(posse)}
                    disabled={!evo.pronto || ocupado !== null}
                    title={evo.maximo ? "Forma final" : undefined}
                    className={
                      evo.pronto
                        ? "cursor-pointer border-2 border-brand-light bg-brand-deep px-4 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
                        : "cursor-not-allowed border-2 border-edge-soft bg-field px-4 py-2.5 font-label text-[10px] tracking-[2px] text-ink-dim"
                    }
                  >
                    {ocupado === posse.criatura.slug
                      ? "..."
                      : evo.maximo
                        ? "FORMA FINAL"
                        : evo.pronto
                          ? "EVOLUIR"
                          : "EVOLUIR"}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {erro ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-lg leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}

      {loja ? (
        <div className="flex flex-col gap-3 border-2 border-brand-shadow bg-panel-soft p-4">
          <p className="m-0 font-label text-[12px] tracking-[2px] text-brand-light">
            ESCOLHA UM NOVO COMPANHEIRO
          </p>
          {carregandoLoja ? (
            <p className="m-0 font-body text-base tracking-[1px] text-ink-muted">
              Carregando catálogo...
            </p>
          ) : disponiveis.length === 0 ? (
            <p className="m-0 font-body text-base tracking-[1px] text-ink-muted">
              Nenhuma criatura nova disponível no momento.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {disponiveis.map((criatura) => (
                <li key={criatura.slug}>
                  <button
                    type="button"
                    onClick={() => adquirir(criatura.slug)}
                    disabled={ocupado !== null}
                    className="cursor-pointer border-2 border-brand bg-transparent px-4 py-2.5 font-label text-[10px] tracking-[2px] text-brand-light shadow-pixel hover:border-brand-pale hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ocupado === criatura.slug
                      ? "..."
                      : criatura.nome.toUpperCase()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
            {rosterLinha}
          </span>
          <button
            type="button"
            onClick={abrirLoja}
            disabled={cheio}
            className={`px-5 py-3 font-display text-[10px] leading-[1.7] tracking-[1px] ${
              cheio
                ? "cursor-not-allowed border-[3px] border-edge-soft bg-field text-ink-dim"
                : "cursor-pointer border-[3px] border-brand bg-transparent text-brand-light shadow-pixel hover:border-brand-pale hover:text-ink-soft"
            }`}
          >
            {cheio ? "EQUIPE CHEIA" : "ADICIONAR PET"}
          </button>
        </div>
      )}

      {evolucao ? (
        <TelaDeEvolucao
          nome={evolucao.nome}
          spriteAntes={evolucao.antes}
          spriteDepois={evolucao.depois}
          estagioAntes={evolucao.estagioAntes}
          estagioDepois={evolucao.estagioDepois}
          aoFechar={() => setEvolucao(null)}
        />
      ) : null}
    </section>
  );
}
