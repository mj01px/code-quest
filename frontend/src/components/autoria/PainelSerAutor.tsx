"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api, listarTrilhas } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { SolicitacaoAutoria, TrilhaResumo } from "@/lib/types";

export const CARTA_MINIMA = 80;

const CAMPO_TEXTO =
  "resize-y border-2 border-brand-strong bg-field px-3.5 py-3 font-body text-[15px] leading-[1.6] text-ink shadow-pixel outline-none focus:border-brand-pale";

const FLUXO = [
  ["01", "ENVIO", "Sua candidatura entra na fila de aprovações do admin.", "VOCÊ"],
  ["02", "REVISÃO", "O admin confere seu histórico e a proposta de conteúdo.", "ADMIN"],
  ["03", "DECISÃO", "Aprovado, você recebe o cargo de autor e o menu de criação.", "ADMIN"],
  ["04", "PRIMEIRA TRILHA", "Todo conteúdo novo passa por revisão antes de ir ao ar.", "VOCÊ"],
] as const;

// null = ainda carregando; "nenhuma" = nunca pediu (o /minha/ deu 404).
type Pedido = SolicitacaoAutoria | "nenhuma" | null;

export function PainelSerAutor() {
  const { usuario, recarregar } = useProgresso();
  const [pedido, setPedido] = useState<Pedido>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  // Depois de uma rejeição, o aluno pede para ver o formulário de novo.
  const [refazendo, setRefazendo] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .minhaSolicitacao()
      .then((s) => {
        if (ativo) setPedido(s);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        if (e instanceof ErroApi && e.naoEncontrado) setPedido("nenhuma");
        else setErroCarga("Não foi possível carregar sua solicitação.");
      });
    return () => {
      ativo = false;
    };
  }, []);

  const jaAutor = usuario?.permissoes.includes("trilhas.create") ?? false;

  function aoEnviar(nova: SolicitacaoAutoria) {
    setPedido(nova);
    setRefazendo(false);
    // A barra lateral lê `solicitacao_pendente` do /eu e esconde o item.
    recarregar();
  }

  let corpo;
  if (jaAutor) {
    corpo = (
      <Aviso cor="border-success text-success" marca="V" titulo="VOCÊ JÁ É AUTOR">
        Crie trilhas, aulas e exercícios na{" "}
        <Link href="/autoria" className="text-brand-light underline underline-offset-4">
          tela de autoria
        </Link>
        .
      </Aviso>
    );
  } else if (erroCarga) {
    corpo = (
      <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
        {erroCarga}
      </p>
    );
  } else if (pedido === null) {
    corpo = (
      <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO...</p>
    );
  } else if (pedido !== "nenhuma" && pedido.situacao === "PENDENTE") {
    corpo = (
      <Aviso cor="border-warning text-warning" marca="!" titulo="EM ANÁLISE">
        Sua solicitação foi enviada e está na fila do administrador. Você será
        avisado pelo menu assim que ela for decidida.
      </Aviso>
    );
  } else if (pedido !== "nenhuma" && pedido.situacao === "REJEITADA" && !refazendo) {
    corpo = (
      <Aviso cor="border-danger text-danger" marca="X" titulo="SOLICITAÇÃO RECUSADA">
        <span className="block">Motivo: {pedido.motivo_rejeicao}</span>
        <span className="mt-4 block">
          <PixelButton variante="secundaria" onClick={() => setRefazendo(true)}>
            TENTAR NOVAMENTE
          </PixelButton>
        </span>
      </Aviso>
    );
  } else {
    corpo = <Formulario aoEnviar={aoEnviar} />;
  }

  return (
    <div className="flex w-full max-w-[780px] flex-col gap-10">
      <div className="flex flex-col gap-3">
        <span className={`text-brand ${TIPO.sobretitulo}`}>{"// PERMISSÕES"}</span>
        <h1 className={`m-0 text-ink ${TIPO.tituloPagina}`}>
          Solicitar acesso de autor
        </h1>
        <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
          Autores criam trilhas, aulas e exercícios para toda a plataforma.
        </p>
      </div>

      {corpo}

      <section aria-label="Como funciona a análise" className="flex flex-col gap-4">
        <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>Como funciona a análise</h2>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {FLUXO.map(([n, titulo, desc, quem]) => (
            <li
              key={n}
              className={`flex flex-wrap items-center gap-4 border-2 border-edge bg-panel px-5 py-4 ${quem === "ADMIN" ? "border-l-4 border-l-brand" : ""}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[11px] text-brand-light">
                {n}
              </span>
              <span className="flex min-w-[200px] flex-1 flex-col gap-1">
                <span className={`text-ink ${TIPO.etiqueta}`}>{titulo}</span>
                <span className="font-body text-base leading-[1.5] text-ink-muted">
                  {desc}
                </span>
              </span>
              <span
                className={`${TIPO.etiqueta} ${quem === "ADMIN" ? "text-brand-light" : "text-ink-muted"}`}
              >
                {quem}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Aviso({
  cor,
  marca,
  titulo,
  children,
}: {
  cor: string;
  marca: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section
      role="status"
      className={`flex flex-wrap items-start gap-6 border-[3px] bg-panel p-7 shadow-pixel-lg ${cor}`}
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-current bg-panel-deep font-label text-[22px]"
      >
        {marca}
      </span>
      <div className="flex min-w-[240px] flex-1 flex-col gap-2">
        <span className={TIPO.tituloSecao}>{titulo}</span>
        <div className={`text-ink-body ${TIPO.corpo}`}>{children}</div>
      </div>
    </section>
  );
}

function Formulario({ aoEnviar }: { aoEnviar: (s: SolicitacaoAutoria) => void }) {
  const [trilhas, setTrilhas] = useState<TrilhaResumo[]>([]);
  const [areas, setAreas] = useState<number[]>([]);
  const [carta, setCarta] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    listarTrilhas()
      .then((lista) => {
        if (ativo) setTrilhas(lista);
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar as trilhas.");
      });
    return () => {
      ativo = false;
    };
  }, []);

  const tamanho = carta.trim().length;
  const faltando = [
    areas.length === 0 && "ESCOLHA UMA ÁREA",
    tamanho < CARTA_MINIMA && "COMPLETE A CARTA",
    !aceite && "ACEITE AS DIRETRIZES",
  ].filter(Boolean);
  const pronto = faltando.length === 0;

  function alternar(id: number) {
    setAreas((atual) =>
      atual.includes(id) ? atual.filter((a) => a !== id) : [...atual, id],
    );
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!pronto) return;
    setEnviando(true);
    setErro(null);
    try {
      aoEnviar(
        await api.solicitarAutoria({
          areas,
          carta_apresentacao: carta.trim(),
          portfolio_link: portfolio.trim(),
          aceite_diretrizes: aceite,
        }),
      );
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível enviar.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-8" noValidate>
      <div className="flex flex-col gap-6 border-2 border-edge bg-panel p-7 shadow-pixel-lg">
        <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>Sua candidatura</h2>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 font-label text-[12px] tracking-[2px] text-ink-label">
            ÁREAS QUE QUER ENSINAR
          </legend>
          <div className="flex flex-wrap gap-2">
            {trilhas.map((t) => {
              const ligado = areas.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={ligado}
                  onClick={() => alternar(t.id)}
                  className={`cursor-pointer border-2 px-4 py-3 font-label text-[11px] tracking-[2px] uppercase shadow-pixel-sm transition-colors duration-150 ${
                    ligado
                      ? "border-brand-light bg-brand-deep text-ink"
                      : "border-edge-soft text-ink-muted hover:border-brand hover:text-ink-soft"
                  }`}
                >
                  {t.nome}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="carta"
            className="font-label text-[12px] tracking-[2px] text-ink-label"
          >
            POR QUE VOCÊ? (MÍN. {CARTA_MINIMA} CARACTERES)
          </label>
          <textarea
            id="carta"
            rows={5}
            value={carta}
            onChange={(e) => setCarta(e.target.value)}
            placeholder="Conte sua experiência com programação e o que pretende criar aqui."
            aria-describedby="carta-contador"
            className={CAMPO_TEXTO}
          />
          <span
            id="carta-contador"
            className={`${TIPO.etiqueta} ${tamanho >= CARTA_MINIMA ? "text-success" : "text-ink-muted"}`}
          >
            {tamanho} / {CARTA_MINIMA} CARACTERES
          </span>
        </div>

        <PixelField
          rotulo="PORTFÓLIO OU GITHUB (OPCIONAL)"
          type="url"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          placeholder="https://github.com/seu-usuario"
        />

        <PixelCheckbox checked={aceite} onChange={(e) => setAceite(e.target.checked)}>
          Aceito as diretrizes de autoria: conteúdo original, sem plágio, e
          revisão do admin antes de publicar.
        </PixelCheckbox>
      </div>

      {erro ? (
        <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-6">
        <span className={`${TIPO.etiqueta} ${pronto ? "text-success" : "text-ink-muted"}`}>
          {pronto ? "> TUDO PRONTO PARA ENVIAR" : `> FALTA: ${faltando.join(" · ")}`}
        </span>
        <PixelButton type="submit" disabled={!pronto || enviando}>
          {enviando ? "ENVIANDO..." : "ENVIAR SOLICITAÇÃO"}
        </PixelButton>
      </div>
    </form>
  );
}
