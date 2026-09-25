"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TelaDeEvolucao } from "@/components/gamificacao/TelaDeEvolucao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api, temSessao } from "@/lib/api";
import type { Criatura, Evolucao, MinhaCriatura } from "@/lib/types";

const MAX = 3;

type Aba = "equipe" | "adquirir";

interface Transicao {
  nome: string;
  antes: string | null;
  depois: string | null;
  estagioAntes: number;
  estagioDepois: number;
}

/** O que dizer sobre a evolução, e se o botão está liberado. O servidor já
 * resolve `pode_evoluir`/`nivel_para_evoluir` pelo nível da criatura; a tela só
 * apresenta. */
function dicaEvolucao(posse: MinhaCriatura): {
  texto: string;
  pronto: boolean;
  maximo: boolean;
} {
  if (posse.proximo_estagio === null) {
    return { texto: "Forma final alcançada", pronto: false, maximo: true };
  }
  if (posse.pode_evoluir) {
    return { texto: "Pronto para evoluir", pronto: true, maximo: false };
  }
  const alvo = posse.nivel_para_evoluir;
  if (alvo === null) {
    return { texto: "Evolução em breve", pronto: false, maximo: false };
  }
  return { texto: `Evolui no nível ${alvo}`, pronto: false, maximo: false };
}

function rotuloEstagio(posse: MinhaCriatura): string {
  return (
    posse.criatura.estagios.find((e) => e.estagio === posse.estagio_atual)
      ?.rotulo ?? ""
  );
}

export function PainelCriatura() {
  const router = useRouter();
  const { recarregar: recarregarProgresso } = useProgresso();

  const [criaturas, setCriaturas] = useState<MinhaCriatura[]>([]);
  const [catalogo, setCatalogo] = useState<Criatura[] | null>(null);
  const [aba, setAba] = useState<Aba>("equipe");
  const [carregando, setCarregando] = useState(true);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [transicao, setTransicao] = useState<Transicao | null>(null);

  const recarregar = useCallback(async () => {
    setCriaturas(await api.minhasCriaturas());
    // Atualiza a barra lateral (pet principal, XP, nível).
    recarregarProgresso();
  }, [recarregarProgresso]);

  useEffect(() => {
    if (!temSessao()) {
      router.replace("/entrar");
      return;
    }
    let ativo = true;
    (async () => {
      try {
        const lista = await api.minhasCriaturas();
        if (ativo) setCriaturas(lista);
      } catch (e) {
        if (!ativo) return;
        if (e instanceof ErroApi && e.status === 401) {
          router.replace("/entrar");
          return;
        }
        setErro(
          e instanceof ErroApi
            ? e.message
            : "Não foi possível carregar suas criaturas.",
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [router]);

  async function irParaAdquirir() {
    setAba("adquirir");
    setErro(null);
    if (catalogo === null) {
      setCarregandoCatalogo(true);
      try {
        setCatalogo(await api.catalogo());
      } catch (e) {
        setErro(
          e instanceof ErroApi ? e.message : "Não deu para carregar o catálogo.",
        );
      } finally {
        setCarregandoCatalogo(false);
      }
    }
  }

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
    // O sprite de origem precisa ser guardado antes: a resposta só traz o novo.
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
      setTransicao({
        nome: posse.criatura.nome,
        antes,
        depois: resultado.criatura.sprite,
        estagioAntes: resultado.estagio_anterior,
        estagioDepois: resultado.criatura.estagio_atual,
      });
    }
    await recarregar();
    setOcupado(null);
  }

  async function adquirir(slug: string) {
    setOcupado(slug);
    setErro(null);
    try {
      await api.adquirirCriatura(slug);
      await recarregar();
      setAba("equipe");
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não deu para adicionar agora.");
    } finally {
      setOcupado(null);
    }
  }

  if (carregando) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-brand-light">
        &gt; CARREGANDO CRIATURA...
      </p>
    );
  }

  const ativa = criaturas.find((c) => c.ativa) ?? null;
  const possuidos = new Set(criaturas.map((c) => c.criatura.slug));
  const cheio = criaturas.length >= MAX;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-label text-[11px] tracking-[2px] text-brand">
          {"// CRIATURA"}
        </span>
        <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
          Minha Criatura
        </h1>
      </div>

      {erro ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {/* CARD DO PET ATIVO */}
        <section className="flex w-full flex-col items-center gap-4 border-[3px] border-brand bg-panel p-6 shadow-frame lg:w-[400px] lg:shrink-0">
          {ativa ? (
            <>
              <div className="relative flex h-[220px] w-[220px] items-center justify-center overflow-hidden bg-panel">
                {ativa.sprite ? (
                  <Image
                    src={ativa.sprite}
                    alt=""
                    width={160}
                    height={160}
                    priority
                    className="animate-bob block h-[160px] w-[160px]"
                  />
                ) : null}
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="font-display text-[16px] leading-[1.5] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
                  {ativa.criatura.nome}
                </span>
                <span className="font-label text-[10px] tracking-[1px] text-ink-muted">
                  {ativa.criatura.especie.toUpperCase()} ·{" "}
                  {ativa.criatura.dominio_rotulo.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <span className="border border-brand-strong px-2.5 py-1 font-label text-[10px] tracking-[1px] text-brand-light">
                  {rotuloEstagio(ativa).toUpperCase()}
                </span>
                <span className="border border-edge-soft px-2.5 py-1 font-label text-[10px] tracking-[1px] text-ink-muted">
                  NÍVEL {ativa.nivel}
                </span>
              </div>

              {(() => {
                const evo = dicaEvolucao(ativa);
                return (
                  <>
                    <span
                      className={`font-label text-[10px] tracking-[1px] ${
                        evo.pronto
                          ? "text-success"
                          : evo.maximo
                            ? "text-brand-light"
                            : "text-ink-muted"
                      }`}
                    >
                      {evo.texto.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => evoluir(ativa)}
                      disabled={!evo.pronto || ocupado !== null}
                      className={
                        evo.pronto
                          ? "w-full cursor-pointer border-[3px] border-brand-light bg-brand-deep px-6 py-4 font-display text-xs leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
                          : "w-full cursor-not-allowed border-[3px] border-edge-soft bg-field px-6 py-4 font-display text-xs leading-[1.7] tracking-[1px] text-ink-dim"
                      }
                    >
                      {ocupado === ativa.criatura.slug
                        ? "..."
                        : evo.maximo
                          ? "FORMA FINAL"
                          : "EVOLUIR"}
                    </button>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-center">
              <span className="font-body text-lg tracking-[1px] text-ink-muted">
                Você ainda não tem um companheiro ativo.
              </span>
              <button
                type="button"
                onClick={irParaAdquirir}
                className="cursor-pointer border-[3px] border-brand bg-transparent px-5 py-3 font-display text-[10px] leading-[1.7] tracking-[1px] text-brand-light shadow-pixel hover:border-brand-pale hover:text-ink-soft"
              >
                ADQUIRIR UMA CRIATURA
              </button>
            </div>
          )}
        </section>

        {/* PAINEL COM ABAS */}
        <section className="flex w-full flex-col border-2 border-edge bg-panel shadow-pixel">
          <div className="flex shrink-0 border-b-2 border-edge">
            <button
              type="button"
              onClick={() => setAba("equipe")}
              className={`flex-1 cursor-pointer border-b-[3px] px-2 py-5 font-label text-[13px] tracking-[1px] ${
                aba === "equipe"
                  ? "border-brand-light text-ink"
                  : "border-transparent text-ink-dim hover:text-ink-muted"
              }`}
            >
              EQUIPE
            </button>
            <button
              type="button"
              onClick={irParaAdquirir}
              className={`flex-1 cursor-pointer border-b-[3px] px-2 py-5 font-label text-[13px] tracking-[1px] ${
                aba === "adquirir"
                  ? "border-brand-light text-ink"
                  : "border-transparent text-ink-dim hover:text-ink-muted"
              }`}
            >
              ADQUIRIR
            </button>
          </div>

          {aba === "equipe" ? (
            <div className="flex flex-col gap-4 p-6 lg:max-h-[420px] lg:overflow-y-auto">
              <div className="flex items-baseline justify-between">
                <span className="font-label text-[11px] tracking-[2px] text-ink-label">
                  SUA EQUIPE
                </span>
                <span className="font-label text-[10px] tracking-[1px] text-ink-muted">
                  {criaturas.length} / {MAX}
                </span>
              </div>

              {criaturas.length === 0 ? (
                <p className="m-0 font-body text-base tracking-[1px] text-ink-muted">
                  Nenhuma criatura na equipe ainda.
                </p>
              ) : (
                criaturas.map((posse) => (
                  <div
                    key={posse.id}
                    className={`flex flex-wrap items-center gap-4 border-2 bg-panel-soft p-4 ${
                      posse.ativa ? "border-edge-soft" : "border-edge"
                    }`}
                  >
                    <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border-2 border-edge bg-panel-deep">
                      {posse.sprite ? (
                        <Image
                          src={posse.sprite}
                          alt=""
                          width={38}
                          height={38}
                          className="block h-[38px] w-[38px]"
                        />
                      ) : null}
                    </span>
                    <span className="flex min-w-[120px] flex-[1_1_140px] flex-col gap-1">
                      <span className="font-body text-xl leading-none text-ink">
                        {posse.criatura.nome}
                      </span>
                      <span className="font-label text-[9px] tracking-[1px] text-ink-muted">
                        {rotuloEstagio(posse).toUpperCase()} · NV {posse.nivel}
                      </span>
                    </span>
                    {posse.ativa ? (
                      <span className="border border-brand-light bg-brand-deep px-2.5 py-1.5 font-label text-[9px] tracking-[1px] text-ink">
                        PRINCIPAL
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => tornarPrincipal(posse.criatura.slug)}
                        disabled={ocupado !== null}
                        className="cursor-pointer border-2 border-edge-soft bg-transparent px-3 py-2 font-label text-[9px] tracking-[1px] text-brand-light shadow-pixel hover:border-brand hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {ocupado === posse.criatura.slug
                          ? "..."
                          : "TORNAR PRINCIPAL"}
                      </button>
                    )}
                  </div>
                ))
              )}

              <p className="m-0 font-body text-base leading-[1.5] tracking-[1px] text-ink-dim">
                O principal recebe todo o XP das fases. Troque quando quiser
                evoluir outro.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-6 lg:max-h-[420px] lg:overflow-y-auto">
              <span className="font-label text-[11px] tracking-[2px] text-ink-label">
                CATÁLOGO DE CRIATURAS
              </span>

              {carregandoCatalogo ? (
                <p className="m-0 font-body text-base tracking-[1px] text-ink-muted">
                  Carregando catálogo...
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(catalogo ?? [])
                    .filter((criatura) => criatura.disponivel)
                    .map((criatura) => {
                    const tenho = possuidos.has(criatura.slug);
                    const sprite = criatura.estagios[0]?.sprite ?? null;
                    return (
                      <div
                        key={criatura.slug}
                        className={`flex flex-col items-center gap-2 border-2 p-4 ${
                          tenho
                            ? "border-brand-strong bg-panel-soft"
                            : "border-edge bg-panel-soft"
                        }`}
                      >
                        <span className="flex h-[84px] w-[84px] items-center justify-center border-2 border-edge bg-panel-deep">
                          {sprite ? (
                            <Image
                              src={sprite}
                              alt=""
                              width={60}
                              height={60}
                              className="block h-[60px] w-[60px]"
                            />
                          ) : null}
                        </span>
                        <span className="font-body text-xl leading-none text-ink">
                          {criatura.nome}
                        </span>
                        <span className="text-center font-label text-[8px] tracking-[1px] text-ink-muted">
                          {criatura.dominio_rotulo.toUpperCase()}
                        </span>

                        {tenho ? (
                          <span className="border border-success px-2.5 py-1.5 font-label text-[9px] tracking-[1px] text-success">
                            NA EQUIPE
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adquirir(criatura.slug)}
                            disabled={cheio || ocupado !== null}
                            className="cursor-pointer border-2 border-brand-light bg-brand-deep px-3 py-2 font-label text-[9px] tracking-[1px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ocupado === criatura.slug
                              ? "..."
                              : cheio
                                ? "EQUIPE CHEIA"
                                : "ADQUIRIR"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="m-0 font-body text-base leading-[1.5] tracking-[1px] text-ink-dim">
                Existe uma criatura por domínio. Novas criaturas chegam nas
                próximas trilhas.
              </p>
            </div>
          )}
        </section>
      </div>

      {transicao ? (
        <TelaDeEvolucao
          nome={transicao.nome}
          spriteAntes={transicao.antes}
          spriteDepois={transicao.depois}
          estagioAntes={transicao.estagioAntes}
          estagioDepois={transicao.estagioDepois}
          aoFechar={() => setTransicao(null)}
        />
      ) : null}
    </div>
  );
}
