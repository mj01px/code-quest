import { blocosDaLicao, trechosInline, type BlocoLicao } from "@/lib/licao";

export function TextoInline({ texto }: { texto: string }) {
  return (
    <>
      {trechosInline(texto).map((trecho, i) => {
        if (trecho.tipo === "codigo") {
          return (
            <code
              key={i}
              className="border border-brand-shadow bg-panel-deep px-1.5 py-0.5 font-terminal text-[1.1em] text-brand-pale"
            >
              {trecho.texto}
            </code>
          );
        }
        if (trecho.tipo === "forte") {
          return (
            <strong key={i} className="font-semibold text-ink">
              {trecho.texto}
            </strong>
          );
        }
        return <span key={i}>{trecho.texto}</span>;
      })}
    </>
  );
}

const CORPO_NORMAL = "m-0 font-body text-lg leading-[1.8] tracking-[0.5px] text-ink-body";
const CORPO_MEDIO = "m-0 font-body text-[17px] leading-[1.6] tracking-[0.5px] text-ink-body";

function Bloco({
  bloco,
  primeiro,
  medio,
}: {
  bloco: BlocoLicao;
  primeiro: boolean;
  medio: boolean;
}) {
  const CORPO = medio ? CORPO_MEDIO : CORPO_NORMAL;
  switch (bloco.tipo) {
    case "secao":
      return (
        <h2
          id={bloco.id}
          className="m-0 mt-8 scroll-mt-8 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink"
        >
          {bloco.texto}
        </h2>
      );
    case "subtitulo":
      return (
        <h3 className="m-0 mt-4 font-label text-[12px] tracking-[2px] text-brand-light uppercase">
          {bloco.texto}
        </h3>
      );
    case "codigo":
      return (
        <pre
          className={`m-0 overflow-x-auto border-l-[3px] border-brand bg-void font-terminal leading-[1.4] text-ink-soft ${
            medio ? "px-4 py-3 text-lg" : "px-5 py-4 text-xl"
          }`}
        >
          <code>{bloco.texto}</code>
        </pre>
      );
    case "destaque":
      return (
        <aside className="flex gap-4 border-2 border-brand-shadow bg-panel-deep p-5">
          <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 bg-brand" />
          <p className={CORPO}>
            <TextoInline texto={bloco.texto} />
          </p>
        </aside>
      );
    case "tabela":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-edge text-left">
            <thead>
              <tr>
                {bloco.cabecalho.map((celula, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-2 border-edge bg-panel-deep px-4 py-3 font-label text-[11px] tracking-[2px] text-brand-light uppercase"
                  >
                    {celula}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((celula, j) => (
                    <td
                      key={j}
                      className="border-2 border-edge px-4 py-3 font-body text-base tracking-[0.5px] text-ink-body"
                    >
                      <TextoInline texto={celula} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "lista": {
      const Tag = bloco.ordenada ? "ol" : "ul";
      return (
        <Tag
          className={`m-0 flex flex-col gap-2 pl-6 ${bloco.ordenada ? "list-decimal" : "list-[square]"} marker:text-brand`}
        >
          {bloco.itens.map((item, i) => (
            <li key={i} className={`pl-1 ${CORPO}`}>
              <TextoInline texto={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "paragrafo":
      return (
        <p
          className={
            primeiro && !medio
              ? "m-0 font-body text-xl leading-[1.7] tracking-[0.5px] text-ink-soft"
              : CORPO
          }
        >
          <TextoInline texto={bloco.texto} />
        </p>
      );
  }
}

export function ConteudoDaLicao({
  markdown,
  tamanho = "normal",
}: {
  markdown: string;
  tamanho?: "normal" | "medio";
}) {
  const blocos = blocosDaLicao(markdown);
  const medio = tamanho === "medio";
  return (
    <div className={`flex flex-col ${medio ? "gap-3" : "gap-5"}`}>
      {blocos.map((bloco, i) => (
        <Bloco key={i} bloco={bloco} primeiro={i === 0} medio={medio} />
      ))}
    </div>
  );
}
