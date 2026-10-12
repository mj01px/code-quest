"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import {
  BANDEIRAS,
  DESCRICAO_MAX,
  NIVEL_MAXIMO,
  NIVEL_MINIMO_GLOBAL,
  NOME_MAX,
  NOME_MIN,
  bandeira,
} from "@/lib/clas";
import type { Bandeira, TipoDeCla } from "@/lib/types";

import { BTN_PRIMARIO, BTN_SECUNDARIO } from "./estilos";
import { IconeCadeado, IconeGlobo, IconeSetaEsquerda } from "./icones";

const TIPOS: { id: TipoDeCla; titulo: string; texto: string }[] = [
  {
    id: "PUBLICO",
    titulo: "PÚBLICO",
    texto: "Entra quem tiver o nível.",
  },
  {
    id: "PRIVADO",
    titulo: "PRIVADO",
    texto: "Só com link de convite.",
  },
];

function SecaoHeader({
  numero,
  rotulo,
  extra,
}: {
  numero: number;
  rotulo: string;
  extra?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-brand-shadow bg-brand-void font-label text-[12px] text-brand-light">
        {numero}
      </span>
      <span className="font-label text-[12px] tracking-[2px] text-ink-label">
        {rotulo}
      </span>
      {extra ? (
        <span className="font-label text-[10px] tracking-[2px] text-ink-ghost">
          {extra}
        </span>
      ) : null}
    </div>
  );
}

export function FormularioCriarCla() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [bandeiraSel, setBandeiraSel] = useState<Bandeira>("guilda_1");
  const [tipo, setTipo] = useState<TipoDeCla>("PUBLICO");
  const [nivel, setNivel] = useState(NIVEL_MINIMO_GLOBAL);

  const [enviando, setEnviando] = useState(false);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const nomeNormalizado = useMemo(
    () => nome.replace(/\s+/g, " ").trim(),
    [nome],
  );
  const nomeCurto = nomeNormalizado.length > 0 && nomeNormalizado.length < NOME_MIN;
  const nomeValido = nomeNormalizado.length >= NOME_MIN;

  const erroNome = errosCampo.nome;
  const temErroNome = nomeCurto || Boolean(erroNome);

  const flag = bandeira(bandeiraSel);
  const nomePrevia = nomeNormalizado ? nomeNormalizado.toUpperCase() : "NOME DO CLÃ";

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nomeValido || enviando) return;

    setEnviando(true);
    setErrosCampo({});
    setErroGeral(null);
    try {
      const cla = await api.criarCla({
        nome: nomeNormalizado,
        descricao: descricao.trim(),
        bandeira: bandeiraSel,
        tipo,
        nivel_minimo: nivel,
      });
      router.push(`/clas/${cla.tag}`);
    } catch (erro) {
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        setErrosCampo(porCampo);
        if (Object.keys(porCampo).length === 0) setErroGeral(erro.message);
      } else {
        setErroGeral("Algo deu errado. Tente de novo.");
      }
      setEnviando(false);
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

      <div className="flex max-w-xl flex-col gap-3">
        <span className="rotulo text-brand-light">Novo clã</span>
        <h1 className="titulo m-0 font-display text-xl leading-[1.6] text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)]">
          Fundar um clã
        </h1>
        <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
          Crie um clã e convide os amigos.
        </p>
      </div>

      <section aria-label="Prévia do clã" className="flex flex-col gap-4">
        <span className="rotulo text-ink-muted">Prévia</span>
        <div className="flex flex-wrap items-stretch border-[3px] border-brand bg-[#15101f] shadow-frame">
          <div className="flex shrink-0 items-center justify-center px-9 py-7">
            <span className="flex h-28 w-28 items-center justify-center border-2 border-brand-shadow bg-void shadow-[0_0_0_4px_rgba(168,85,247,0.22),0_0_0_8px_rgba(168,85,247,0.10)]">
              <Image
                src={flag.src}
                alt="Bandeira escolhida"
                width={92}
                height={92}
                className="block h-[92px] w-[92px]"
              />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 basis-80 flex-col gap-4 px-7 py-6">
            <div className="flex flex-col gap-2">
              <span className="font-display text-[15px] leading-[1.6] break-words text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
                {nomePrevia}
              </span>
              <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
                #TAG GERADA AO FUNDAR
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 font-label text-[10px] tracking-[2px] ${
                  tipo === "PUBLICO"
                    ? "border-2 border-success text-success"
                    : "border-2 border-brand text-brand-light"
                }`}
              >
                {tipo === "PUBLICO" ? "PÚBLICO" : "PRIVADO"}
              </span>
              <span className="inline-flex items-center border-2 border-edge-soft px-2.5 py-1 font-label text-[10px] tracking-[2px] text-ink-muted">
                1/50 MEMBROS
              </span>
              <span className="inline-flex items-center border-2 border-edge-soft px-2.5 py-1 font-label text-[10px] tracking-[2px] text-ink-muted">
                NV {nivel}
              </span>
              <span className="inline-flex items-center border-2 border-brand bg-brand px-2.5 py-1 font-label text-[10px] tracking-[2px] text-void">
                LÍDER · VOCÊ
              </span>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={aoEnviar} className="flex flex-col gap-5">
        <section className="flex flex-col gap-6 border-2 border-edge bg-panel p-6 shadow-pixel-lg">
          <SecaoHeader numero={1} rotulo="IDENTIDADE" />

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <label
                htmlFor="nome"
                className="font-label text-[11px] tracking-[2px] text-ink-label"
              >
                NOME DO CLÃ
              </label>
              <span
                className={`font-label text-[11px] tracking-[2px] ${
                  nomeCurto ? "text-danger" : "text-ink-muted"
                }`}
              >
                {nome.length}/{NOME_MAX}
              </span>
            </div>
            <div
              className={`flex items-center bg-field px-3.5 shadow-pixel ${
                temErroNome ? "border-2 border-danger" : "border-2 border-brand-strong"
              }`}
            >
              <input
                id="nome"
                type="text"
                maxLength={NOME_MAX}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Os Compiladores"
                aria-describedby="dica-nome"
                aria-invalid={temErroNome}
                className="min-w-0 flex-1 border-0 bg-transparent py-3 font-body text-[15px] text-ink outline-none"
              />
            </div>
            <p
              id="dica-nome"
              className={`m-0 font-body text-sm leading-[1.6] ${
                temErroNome ? "text-danger" : "text-ink-muted"
              }`}
            >
              {erroNome
                ? erroNome
                : nomeCurto
                  ? `O nome precisa ter pelo menos ${NOME_MIN} caracteres.`
                  : "Letras, números e espaços. Não muda depois."}
            </p>
          </div>

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 p-0 font-label text-[11px] tracking-[2px] text-ink-label">
              BANDEIRA
            </legend>
            <div className="grid grid-cols-4 gap-3.5">
              {BANDEIRAS.map((b) => {
                const marcada = b.slug === bandeiraSel;
                return (
                  <button
                    key={b.slug}
                    type="button"
                    aria-pressed={marcada}
                    aria-label={b.rotulo}
                    onClick={() => setBandeiraSel(b.slug)}
                    className={`flex aspect-square items-center justify-center bg-void p-2 ${
                      marcada
                        ? "border-[3px] border-brand-light shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)]"
                        : "border-2 border-edge-soft"
                    }`}
                  >
                    <Image
                      src={b.src}
                      alt=""
                      width={64}
                      height={64}
                      className="block h-16 w-16"
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section className="flex flex-col gap-4 border-2 border-edge bg-panel p-6 shadow-pixel-lg">
          <SecaoHeader numero={2} rotulo="DESCRIÇÃO" extra="OPCIONAL" />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <label
                htmlFor="descricao"
                className="font-label text-[11px] tracking-[2px] text-ink-muted"
              >
                RESUMO
              </label>
              <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
                {descricao.length}/{DESCRICAO_MAX}
              </span>
            </div>
            <textarea
              id="descricao"
              rows={3}
              maxLength={DESCRICAO_MAX}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Sobre o que é o clã?"
              className="resize-y border-2 border-brand-strong bg-field px-3.5 py-3 font-body text-[15px] leading-[1.6] text-ink shadow-pixel outline-none"
            />
            {errosCampo.descricao ? (
              <p className="m-0 font-body text-sm text-danger">
                {errosCampo.descricao}
              </p>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-6 border-2 border-edge bg-panel p-6 shadow-pixel-lg">
          <SecaoHeader numero={3} rotulo="ACESSO" />

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="p-0 font-label text-[11px] tracking-[2px] text-ink-label">
              QUEM PODE ENTRAR
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {TIPOS.map((t) => {
                const marcado = t.id === tipo;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => setTipo(t.id)}
                    className={`flex flex-col gap-2.5 bg-panel-deep p-4 text-left ${
                      marcado
                        ? "border-[3px] border-brand-light shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)]"
                        : "border-2 border-edge-soft"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex ${marcado ? "text-brand-light" : "text-ink-ghost"}`}
                      >
                        {t.id === "PUBLICO" ? (
                          <IconeGlobo size={20} />
                        ) : (
                          <IconeCadeado size={20} />
                        )}
                      </span>
                      <span className="font-label text-[12px] tracking-[2px] text-ink">
                        {t.titulo}
                      </span>
                    </span>
                    <span className="font-body text-sm leading-[1.5] text-ink-muted">
                      {t.texto}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <span
              id="rotulo-nivel"
              className="font-label text-[11px] tracking-[2px] text-ink-label"
            >
              NÍVEL MÍNIMO PRA ENTRAR
            </span>
            <div
              role="group"
              aria-labelledby="rotulo-nivel"
              className="flex flex-wrap items-center gap-3.5"
            >
              <div className="flex items-stretch border-2 border-edge-soft bg-void">
                <button
                  type="button"
                  aria-label="Diminuir nível mínimo"
                  onClick={() => setNivel((n) => Math.max(NIVEL_MINIMO_GLOBAL, n - 1))}
                  disabled={nivel <= NIVEL_MINIMO_GLOBAL}
                  className="h-12 w-12 border-r-2 border-edge-soft font-display text-sm text-brand-light disabled:opacity-40"
                >
                  -
                </button>
                <span
                  aria-live="polite"
                  className="flex min-w-[72px] items-center justify-center px-3 font-display text-[15px] text-ink"
                >
                  {nivel}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar nível mínimo"
                  onClick={() => setNivel((n) => Math.min(NIVEL_MAXIMO, n + 1))}
                  disabled={nivel >= NIVEL_MAXIMO}
                  className="h-12 w-12 border-l-2 border-edge-soft font-display text-sm text-brand-light disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <span className="flex-1 basis-56 font-body text-sm leading-[1.5] text-ink-muted">
                De {NIVEL_MINIMO_GLOBAL} a {NIVEL_MAXIMO}.
              </span>
            </div>
            {errosCampo.nivel_minimo ? (
              <p className="m-0 font-body text-sm text-danger">
                {errosCampo.nivel_minimo}
              </p>
            ) : null}
          </div>
        </section>

        {erroGeral ? (
          <p role="alert" className="m-0 font-body text-base text-danger">
            {erroGeral}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button
            type="submit"
            className={BTN_PRIMARIO}
            disabled={!nomeValido || enviando}
          >
            {enviando ? "FUNDANDO..." : "FUNDAR CLÃ"}
          </button>
          <Link href="/clas" className={BTN_SECUNDARIO}>
            CANCELAR
          </Link>
        </div>
      </form>
    </div>
  );
}
