"use client";

import { useCallback, useEffect, useState } from "react";

import { BarraDeFoco } from "@/components/layout/BarraDeFoco";
import { TextoInline } from "@/components/licao/ConteudoDaLicao";
import { LinkDeAcao } from "@/components/licao/LinkDeAcao";
import { PetComDica } from "@/components/licao/PetComDica";

export interface CardDaSessao {
  id: number;
  pergunta: string;
  resposta: string;
  dica?: string;
  baralho: string;
}

const SECUNDARIO =
  "cursor-pointer border-2 border-edge-soft bg-transparent px-5 py-3.5 font-label text-[11px] tracking-[2px] text-ink-body uppercase hover:border-brand hover:text-ink-soft";

const PRIMARIO =
  "cursor-pointer border-[3px] border-brand-light bg-brand-deep px-6 py-3.5 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong";

const MOLDURA =
  "flex min-h-[18rem] w-full flex-col justify-center gap-5 border-[3px] p-6 text-left sm:p-10";

const MOLDURA_PERGUNTA =
  "border-brand bg-panel shadow-[0_0_0_3px_var(--color-brand-void),0_0_0_6px_rgba(168,85,247,0.18),8px_8px_0_rgba(0,0,0,0.7)]";

function dicaDo(card: CardDaSessao): string {
  return card.dica?.trim() || `Lembra da lição de ${card.baralho}? A resposta está lá.`;
}

function mensagemDoResultado(sabia: number, total: number): string {
  if (sabia === total) return "Você sabia todos. Volte amanhã para fixar de vez.";
  if (sabia === 0) {
    return "Nenhum de primeira, e tudo bem: é para isso que o baralho existe. Revise os cards e tente de novo.";
  }
  const faltam = total - sabia;
  return `Você já domina ${sabia === 1 ? "1 card" : `${sabia} cards`}. Revise ${
    faltam === 1 ? "o que ficou" : `os ${faltam} que ficaram`
  } para trás enquanto o conteúdo está fresco.`;
}

export function SessaoFlashcards({
  cards,
  rotaDaTrilha,
}: {
  cards: CardDaSessao[];
  rotaDaTrilha: string;
}) {
  const [baralho, setBaralho] = useState(cards);
  const [fila, setFila] = useState(cards);
  const [virado, setVirado] = useState(false);
  const [sabia, setSabia] = useState<CardDaSessao[]>([]);
  const [revisar, setRevisar] = useState<CardDaSessao[]>([]);

  const total = baralho.length;
  const respondidos = sabia.length + revisar.length;
  const terminou = fila.length === 0;
  const card = fila[0];

  const virar = useCallback(() => setVirado((v) => !v), []);

  useEffect(() => {
    if (terminou) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.code !== "Space" || evento.target instanceof HTMLButtonElement) return;
      evento.preventDefault();
      virar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [terminou, virar]);

  function marcar(resultado: "sabia" | "revisar") {
    if (resultado === "sabia") setSabia((lista) => [...lista, card]);
    else setRevisar((lista) => [...lista, card]);
    setFila((atual) => atual.slice(1));
    setVirado(false);
  }

  function pular() {
    setFila((atual) => [...atual.slice(1), atual[0]]);
    setVirado(false);
  }

  function recomecar(novo: CardDaSessao[]) {
    setBaralho(novo);
    setFila(novo);
    setVirado(false);
    setSabia([]);
    setRevisar([]);
  }

  const placar = (
    <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase sm:text-[11px]">
      {sabia.length} sabia · {revisar.length} revisar
    </span>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraDeFoco sairHref={rotaDaTrilha} placar={placar} />

      <main className="flex flex-1 justify-center px-4 py-10 sm:px-8 sm:py-14">
        <div className="relative flex w-full max-w-3xl flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h1 className="m-0 font-display text-[14px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[16px]">
              Flashcards
            </h1>
            <div className="flex w-full gap-[3px]" aria-hidden="true">
              {baralho.map((c, i) => (
                <span
                  key={c.id}
                  className={`h-2.5 max-w-12 flex-1 border border-edge-soft ${
                    i < respondidos ? "bg-brand" : i === respondidos ? "bg-brand-shadow" : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 font-label text-[11px] tracking-[2px] uppercase">
              <span className="text-brand-light">
                {terminou ? "Baralho concluído" : `Card ${respondidos + 1} de ${total}`}
              </span>
              <span className="text-ink-muted">
                {terminou ? `${total} ${total === 1 ? "card" : "cards"}` : `Baralho: ${card.baralho}`}
              </span>
            </div>

            {terminou ? (
              <section aria-label="Resultado" className={`${MOLDURA} ${MOLDURA_PERGUNTA}`}>
                <span className="flex items-center gap-3 font-label text-[12px] tracking-[3px] text-brand-light">
                  <span aria-hidden="true" className="h-3 w-3 bg-brand" />
                  RESULTADO
                </span>
                <p
                  role="status"
                  className="m-0 font-display text-[16px] leading-[1.8] tracking-[1px] text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[20px]"
                >
                  {sabia.length} de {total}
                </p>
                <p className="m-0 font-body text-xl leading-[1.7] tracking-[0.5px] text-ink-soft">
                  {mensagemDoResultado(sabia.length, total)}
                </p>
              </section>
            ) : (
              <button
                type="button"
                aria-pressed={virado}
                aria-label={virado ? "Ver a pergunta" : "Revelar a resposta"}
                onClick={virar}
                className={`${MOLDURA} cursor-pointer transition-colors duration-150 ${
                  virado
                    ? "border-success bg-panel-soft shadow-[0_0_0_3px_var(--color-brand-void),8px_8px_0_rgba(0,0,0,0.7)]"
                    : `${MOLDURA_PERGUNTA} hover:border-brand-pale`
                }`}
              >
                <span
                  className={`flex items-center gap-3 font-label text-[12px] tracking-[3px] ${virado ? "text-success" : "text-brand-light"}`}
                >
                  <span aria-hidden="true" className={`h-3 w-3 ${virado ? "bg-success" : "bg-brand"}`} />
                  {virado ? "RESPOSTA" : "PERGUNTA"}
                </span>
                <span
                  className={
                    virado
                      ? "font-body text-xl leading-[1.7] tracking-[0.5px] text-ink-soft"
                      : "font-display text-[14px] leading-[1.8] tracking-[1px] text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[16px]"
                  }
                >
                  <TextoInline texto={virado ? card.resposta : card.pergunta} />
                </span>
                {virado ? (
                  <span className="font-terminal text-xl tracking-[1px] text-ink-muted">
                    &gt; você sabia?
                  </span>
                ) : null}
              </button>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-label text-[10px] tracking-[2px] text-ink-dim uppercase">
                {terminou ? `${sabia.length} sabia · ${revisar.length} revisar` : "Espaço vira o card"}
              </span>
              {terminou ? (
                <div className="flex flex-wrap gap-3">
                  <LinkDeAcao href={rotaDaTrilha} variante="secundario">
                    Voltar para a trilha
                  </LinkDeAcao>
                  <button type="button" onClick={() => recomecar(cards)} className={SECUNDARIO}>
                    Recomeçar
                  </button>
                  {revisar.length > 0 ? (
                    <button type="button" onClick={() => recomecar(revisar)} className={PRIMARIO}>
                      Revisar {revisar.length}
                    </button>
                  ) : null}
                </div>
              ) : virado ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => marcar("revisar")}
                    className="cursor-pointer border-2 border-warning bg-transparent px-5 py-3.5 font-label text-[11px] tracking-[2px] text-warning uppercase hover:bg-panel-soft"
                  >
                    Revisar
                  </button>
                  <button
                    type="button"
                    onClick={() => marcar("sabia")}
                    className="cursor-pointer border-2 border-success bg-transparent px-5 py-3.5 font-label text-[11px] tracking-[2px] text-success uppercase hover:bg-panel-soft"
                  >
                    Sabia
                  </button>
                </div>
              ) : fila.length > 1 ? (
                <button type="button" onClick={pular} className={SECUNDARIO}>
                  Pular card &gt;
                </button>
              ) : null}
            </div>
          </div>

          {terminou ? null : (
            <aside className="flex justify-center xl:absolute xl:top-1/2 xl:left-[calc(100%+3rem)] xl:w-64 xl:-translate-y-1/2 xl:justify-start">
              <PetComDica key={card.id} dica={dicaDo(card)} />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
