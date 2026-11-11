"use client";

import { useState } from "react";

import { BOTAO_ICONE } from "@/components/autoria/AcoesRascunho";
import { AreaDeTexto, ROTULO } from "@/components/autoria/AreaDeTexto";
import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";
import { IconeLixeira } from "@/components/ui/Icone";
import { PixelField } from "@/components/ui/PixelField";
import {
  licaoEditavel,
  markdownDaLicao,
  rotuloDaSecao,
  secoesDaLicao,
  type SecaoEditavel,
} from "@/lib/licao";
import { TIPO } from "@/lib/tipografia";

// Slot tracejado de "adicionar" que fecha cada bloco do construtor.
export const BOTAO_SLOT =
  "w-full cursor-pointer border-2 border-dashed border-edge-soft bg-transparent px-4 py-4 font-label text-[11px] tracking-[2px] text-brand-light uppercase transition-colors duration-150 hover:border-brand hover:bg-panel-soft hover:text-ink";

type Secao = SecaoEditavel & { chave: number };

const vazia = (chave: number): Secao => ({ chave, titulo: "", texto: "" });

// A lição como o aluno a lê: introdução e seções, cada título um item do
// índice "Nesta lição". O banco só vê o Markdown que sai de `markdownDaLicao`.
export function EditorDeSecoes({
  id,
  inicial,
  aoMudar,
}: {
  id: string;
  inicial: string;
  /** `completa` é falso com seção que tem texto e não tem título (sumiria do índice) ou lição vazia. */
  aoMudar: (markdown: string, completa: boolean) => void;
}) {
  const [intro, setIntro] = useState(() => licaoEditavel(inicial).intro);
  const [secoes, setSecoes] = useState<Secao[]>(() => {
    const lidas = licaoEditavel(inicial).secoes.map((s, chave) => ({ ...s, chave }));
    return lidas.length > 0 || inicial.trim() ? lidas : [vazia(0)];
  });

  const markdown = markdownDaLicao({ intro, secoes });
  const indice = secoesDaLicao(markdown);

  function atualizar(novaIntro: string, novas: Secao[]) {
    setIntro(novaIntro);
    setSecoes(novas);
    const md = markdownDaLicao({ intro: novaIntro, secoes: novas });
    // Seção vazia é ignorada ao montar; com texto, precisa de título.
    aoMudar(md, md.trim() !== "" && novas.every((s) => s.titulo.trim() || !s.texto.trim()));
  }

  const mudar = (i: number, campo: Partial<SecaoEditavel>) =>
    atualizar(intro, secoes.map((s, j) => (j === i ? { ...s, ...campo } : s)));

  function mover(i: number, passo: -1 | 1) {
    const novas = [...secoes];
    [novas[i], novas[i + passo]] = [novas[i + passo]!, novas[i]!];
    atualizar(intro, novas);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <AreaDeTexto
          id={`${id}-intro`}
          rotulo="INTRODUÇÃO (OPCIONAL)"
          markdown
          rows={3}
          value={intro}
          onChange={(e) => atualizar(e.target.value, secoes)}
          placeholder="O que o aluno vai aprender nesta aula e por quê."
        />

        {secoes.length > 0 ? (
          <ol aria-label="Seções da lição" className="m-0 flex list-none flex-col gap-4 p-0">
            {secoes.map((secao, i) => (
              <li
                key={secao.chave}
                className="flex flex-col gap-4 border-2 border-edge border-l-4 border-l-brand bg-panel-deep p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-brand-light ${TIPO.etiqueta}`}>SEÇÃO {i + 1}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Subir seção ${i + 1}`}
                      disabled={i === 0}
                      onClick={() => mover(i, -1)}
                      className={BOTAO_ICONE}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Descer seção ${i + 1}`}
                      disabled={i === secoes.length - 1}
                      onClick={() => mover(i, 1)}
                      className={BOTAO_ICONE}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover seção ${i + 1}`}
                      onClick={() => atualizar(intro, secoes.filter((_, j) => j !== i))}
                      className={BOTAO_ICONE}
                    >
                      <IconeLixeira className="h-4 w-4" />
                    </button>
                  </span>
                </div>
                <PixelField
                  rotulo={`TÍTULO DA SEÇÃO ${i + 1}`}
                  value={secao.titulo}
                  maxLength={120}
                  placeholder="Ex: Strings não mudam"
                  // Só cobra o título quando já há texto: a seção recém-criada não grita.
                  erro={
                    secao.texto.trim() && !secao.titulo.trim()
                      ? "Dê um título: ele vira o item do índice da lição."
                      : null
                  }
                  onChange={(e) => mudar(i, { titulo: e.target.value })}
                />
                <AreaDeTexto
                  id={`${id}-secao-${secao.chave}`}
                  rotulo={`TEXTO DA SEÇÃO ${i + 1}`}
                  markdown
                  rows={6}
                  value={secao.texto}
                  onChange={(e) => mudar(i, { texto: e.target.value })}
                />
              </li>
            ))}
          </ol>
        ) : null}

        <button
          type="button"
          className={BOTAO_SLOT}
          onClick={() =>
            atualizar(intro, [...secoes, vazia(Math.max(-1, ...secoes.map((s) => s.chave)) + 1)])
          }
        >
          + ADICIONAR SEÇÃO
        </button>
        <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
          Cada título vira um item do índice &quot;Nesta lição&quot;. No texto: ### para
          subtítulo, ``` para código, &gt; para destaque e - para lista.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className={ROTULO}>COMO O ALUNO VÊ</span>
        {indice.length > 0 ? (
          <div className="flex flex-col gap-2 border-2 border-edge bg-panel p-4">
            <span className={`text-ink-muted ${TIPO.etiqueta}`}>NESTA LIÇÃO</span>
            <ol aria-label="Prévia do índice" className="m-0 flex list-none flex-col gap-1.5 p-0">
              {indice.map((secao, i) => (
                <li key={i} className="flex items-center gap-3 font-label text-[11px] tracking-[2px] text-ink-body uppercase">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 bg-brand-shadow" />
                  {rotuloDaSecao(secao.titulo)}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <div className="min-h-[120px] border-2 border-edge bg-panel-deep p-4">
          {markdown ? (
            <ConteudoDaLicao markdown={markdown} tamanho="medio" embutido />
          ) : (
            <p className={`m-0 text-ink-dim ${TIPO.corpo}`}>Nada para mostrar ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
