import { TIPO } from "@/lib/tipografia";

type Bloco =
  | { tipo: "titulo"; nivel: number; texto: string }
  | { tipo: "codigo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "paragrafo"; texto: string };

/** Quebra o Markdown em blocos: títulos (#), cercas de código, listas (- ou *) e parágrafos. */
export function blocosDe(markdown: string): Bloco[] {
  const blocos: Bloco[] = [];
  const linhas = markdown.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.startsWith("```")) {
      const codigo: string[] = [];
      while (++i < linhas.length && !linhas[i].startsWith("```")) codigo.push(linhas[i]);
      blocos.push({ tipo: "codigo", texto: codigo.join("\n") });
      continue;
    }
    const titulo = /^(#{1,3})\s+(.*)$/.exec(linha);
    if (titulo) {
      blocos.push({ tipo: "titulo", nivel: titulo[1].length, texto: titulo[2] });
      continue;
    }
    const item = /^\s*[-*]\s+(.*)$/.exec(linha);
    const ultimo = blocos.at(-1);
    if (item) {
      if (ultimo?.tipo === "lista") ultimo.itens.push(item[1]);
      else blocos.push({ tipo: "lista", itens: [item[1]] });
      continue;
    }
    if (linha.trim() === "") continue;
    // Linhas seguidas sem linha em branco são o mesmo parágrafo.
    const anterior = linhas[i - 1];
    if (ultimo?.tipo === "paragrafo" && anterior !== undefined && anterior.trim() !== "") {
      ultimo.texto += ` ${linha.trim()}`;
    } else {
      blocos.push({ tipo: "paragrafo", texto: linha.trim() });
    }
  }
  return blocos;
}

const CLASSE_TITULO = [TIPO.tituloPagina, TIPO.tituloSecao, TIPO.sobretitulo];

// ponytail: subconjunto do Markdown (sem negrito, link nem tabela), suficiente
// para revisar a estrutura da aula. Trocar por um renderizador de verdade
// quando a aula publicada passar a exibir Markdown formatado.
// Texto entra como filho do JSX, nunca como HTML: nada do autor vira marcação.
export function PreviaMarkdown({ markdown }: { markdown: string }) {
  const blocos = blocosDe(markdown);
  if (blocos.length === 0) {
    return <p className={`m-0 text-ink-dim ${TIPO.corpo}`}>Nada para mostrar ainda.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === "titulo") {
          const Tag = `h${bloco.nivel + 2}` as "h3" | "h4" | "h5";
          return (
            <Tag key={i} className={`m-0 text-ink ${CLASSE_TITULO[bloco.nivel - 1]}`}>
              {bloco.texto}
            </Tag>
          );
        }
        if (bloco.tipo === "codigo") {
          return (
            <pre
              key={i}
              className="m-0 overflow-x-auto border-2 border-edge bg-void p-4 font-terminal text-lg text-ink"
            >
              <code>{bloco.texto}</code>
            </pre>
          );
        }
        if (bloco.tipo === "lista") {
          return (
            <ul key={i} className="m-0 flex list-disc flex-col gap-1 pl-6">
              {bloco.itens.map((item, j) => (
                <li key={j} className={`text-ink-body ${TIPO.corpo}`}>
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={`m-0 text-ink-body ${TIPO.corpo}`}>
            {bloco.texto}
          </p>
        );
      })}
    </div>
  );
}
