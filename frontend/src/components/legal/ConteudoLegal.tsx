import Link from "next/link";
import type { BlocoLicao } from "@/lib/licao";
import { estruturarDocumento, trechosLegais } from "@/lib/textoLegal";
import { Destaque, Item, Lista, Paragrafo, Secao, Tabela } from "./Prosa";

export function TextoLegal({ texto }: { texto: string }) {
  return (
    <>
      {trechosLegais(texto).map((trecho, i) => {
        if (trecho.tipo === "forte") {
          return (
            <strong key={i} className="font-semibold text-ink-soft">
              {trecho.texto}
            </strong>
          );
        }
        if (trecho.tipo === "link") {
          return trecho.interno ? (
            <Link key={i} href={trecho.href}>
              {trecho.texto}
            </Link>
          ) : (
            <a key={i} href={trecho.href}>
              {trecho.texto}
            </a>
          );
        }
        return <span key={i}>{trecho.texto}</span>;
      })}
    </>
  );
}

function BlocoLegal({ bloco }: { bloco: BlocoLicao }) {
  switch (bloco.tipo) {
    case "paragrafo":
      return (
        <Paragrafo>
          <TextoLegal texto={bloco.texto} />
        </Paragrafo>
      );
    case "destaque":
      return (
        <Destaque>
          <TextoLegal texto={bloco.texto} />
        </Destaque>
      );
    case "lista":
      return (
        <Lista>
          {bloco.itens.map((item, i) => (
            <Item key={`${i}-${item}`}>
              <TextoLegal texto={item} />
            </Item>
          ))}
        </Lista>
      );
    case "tabela":
      return (
        <Tabela
          colunas={bloco.cabecalho}
          linhas={bloco.linhas.map((celulas, i) => ({
            chave: `${i}-${celulas[0] ?? ""}`,
            celulas: celulas.map((celula, j) => (
              <TextoLegal key={j} texto={celula} />
            )),
          }))}
        />
      );
    case "subtitulo":
      return (
        <h3 className="m-0 font-label text-[12px] tracking-[2px] text-brand-light uppercase">
          {bloco.texto}
        </h3>
      );
    case "codigo":
      return (
        <pre className="m-0 overflow-x-auto border-l-[3px] border-brand bg-void px-4 py-3 font-terminal text-lg text-ink-soft">
          <code>{bloco.texto}</code>
        </pre>
      );
    case "secao":
      return null;
  }
}

export function ConteudoLegal({ markdown }: { markdown: string }) {
  const { introducao, secoes } = estruturarDocumento(markdown);

  return (
    <>
      {introducao.map((bloco, i) => (
        <BlocoLegal key={`intro-${i}`} bloco={bloco} />
      ))}
      {secoes.map((secao) => (
        <Secao key={secao.numero} numero={secao.numero} titulo={secao.titulo}>
          {secao.blocos.map((bloco, i) => (
            <BlocoLegal key={i} bloco={bloco} />
          ))}
        </Secao>
      ))}
    </>
  );
}
