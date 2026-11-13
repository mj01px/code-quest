"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

import { IconeLupa } from "@/components/ui/Icone";
import {
  buscarNoFaq,
  type CategoriaFaq,
  type PerguntaFaq,
  type ResultadoFaq,
} from "@/lib/faq";
import { TIPO } from "@/lib/tipografia";

interface Props {
  categorias: CategoriaFaq[];
  categoriaInicial?: string;
  buscaInicial?: string;
}

/** Renderiza **negrito** e [texto](/rota) da resposta; o resto é texto. */
export function renderizarResposta(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return partes.filter(Boolean).map((parte, i) => {
    const negrito = /^\*\*([^*]+)\*\*$/.exec(parte);
    if (negrito) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {negrito[1]}
        </strong>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(parte);
    if (link) {
      return (
        <Link key={i} href={link[2]}>
          {link[1]}
        </Link>
      );
    }
    return parte;
  });
}

function atualizarUrl(categoria: string, busca: string, ancora?: string) {
  const params = new URLSearchParams();
  if (busca.trim()) params.set("q", busca.trim());
  else params.set("categoria", categoria);
  const hash = ancora ? `#${ancora}` : "";
  window.history.replaceState(null, "", `/faq?${params.toString()}${hash}`);
}

export function CentralDeFaq({ categorias, categoriaInicial, buscaInicial = "" }: Props) {
  const idBusca = useId();
  const primeira = categorias[0].id;
  const [categoria, setCategoria] = useState(
    categorias.some((c) => c.id === categoriaInicial) ? categoriaInicial! : primeira,
  );
  const [busca, setBusca] = useState(buscaInicial);
  const [aberta, setAberta] = useState<string | null>(null);

  // Link direto (/faq#ranking): vai para a categoria certa e abre a pergunta.
  // O hash não chega ao servidor, então só dá para ler depois da hidratação.
  useEffect(() => {
    function aplicarAncora() {
      const ancora = decodeURIComponent(window.location.hash.slice(1));
      const dona = categorias.find((c) => c.perguntas.some((p) => p.id === ancora));
      if (!ancora || !dona) return;
      setBusca("");
      setCategoria(dona.id);
      setAberta(ancora);
      requestAnimationFrame(() =>
        document.getElementById(ancora)?.scrollIntoView({ block: "center" }),
      );
    }
    const quadro = requestAnimationFrame(aplicarAncora);
    window.addEventListener("hashchange", aplicarAncora);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("hashchange", aplicarAncora);
    };
  }, [categorias]);

  const buscando = busca.trim().length > 0;
  const atual = categorias.find((c) => c.id === categoria) ?? categorias[0];
  const itens: (PerguntaFaq | ResultadoFaq)[] = buscando
    ? buscarNoFaq(categorias, busca)
    : atual.perguntas;

  function escolherCategoria(id: string) {
    setCategoria(id);
    setBusca("");
    setAberta(null);
    atualizarUrl(id, "");
  }

  function digitarBusca(valor: string) {
    setBusca(valor);
    setAberta(null);
    atualizarUrl(categoria, valor);
  }

  function alternar(id: string) {
    const proxima = aberta === id ? null : id;
    setAberta(proxima);
    atualizarUrl(categoria, busca, proxima ?? undefined);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor={idBusca} className="sr-only">
          Buscar no FAQ
        </label>
        <div className="flex items-center gap-3 border-2 border-brand-strong bg-field px-4 shadow-pixel focus-within:border-brand-pale">
          <IconeLupa className="h-5 w-5 text-brand" />
          <input
            id={idBusca}
            type="search"
            value={busca}
            onChange={(e) => digitarBusca(e.target.value)}
            placeholder="Busque por palavra-chave: senha, ranking, XP..."
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-3.5 font-body text-[17px] text-ink outline-none placeholder:text-ink-ghost [&::-webkit-search-cancel-button]:hidden"
          />
          {buscando ? (
            <button
              type="button"
              onClick={() => digitarBusca("")}
              className="shrink-0 font-label text-[10px] tracking-[2px] text-ink-muted hover:text-ink"
            >
              LIMPAR
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
        <nav aria-label="Categorias do FAQ" className="min-w-0">
          <p className={`mb-3 ${TIPO.etiqueta} text-ink-dim`}>CATEGORIAS</p>
          <ul className="-mx-1 flex list-none gap-2 overflow-x-auto p-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:p-0">
            {categorias.map((c, i) => {
              const ativa = !buscando && c.id === categoria;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => escolherCategoria(c.id)}
                    aria-current={ativa ? "true" : undefined}
                    className={`flex w-full items-center gap-2 whitespace-nowrap border-2 px-3 py-2.5 text-left font-label text-[10px] leading-[1.5] tracking-[0.15em] lg:whitespace-normal ${
                      ativa
                        ? "border-brand bg-brand-deep text-ink shadow-pixel"
                        : "border-edge bg-panel text-ink-muted hover:border-brand hover:text-brand-mist"
                    }`}
                  >
                    <span className={ativa ? "text-ink" : "text-brand-light"}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">{c.titulo.toUpperCase()}</span>
                    <span className="ml-auto pl-2 text-ink-dim">{c.perguntas.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-live="polite" className="min-w-0">
          <header className="mb-6 flex flex-col gap-2">
            <h2 className={`m-0 ${TIPO.tituloSecao} text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]`}>
              {buscando ? "Resultados da busca" : atual.titulo}
            </h2>
            <p className={`m-0 ${TIPO.corpo} text-ink-muted`}>
              {buscando
                ? `${itens.length} ${itens.length === 1 ? "pergunta encontrada" : "perguntas encontradas"} para “${busca.trim()}”.`
                : atual.descricao}
            </p>
          </header>

          {itens.length === 0 ? (
            <div className="flex flex-col items-center gap-4 border-2 border-dashed border-edge-soft px-6 py-14 text-center">
              <IconeLupa className="h-8 w-8 text-ink-dim" />
              <p className={`m-0 ${TIPO.corpo} text-ink-muted`}>
                Nenhuma pergunta encontrada. Tenta outra palavra ou fala com o{" "}
                <Link href="/suporte">suporte</Link>.
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {itens.map((item) => {
                const aberto = aberta === item.id;
                const painel = `${item.id}-resposta`;
                return (
                  <li
                    key={item.id}
                    id={item.id}
                    className={`scroll-mt-24 border-2 ${
                      aberto ? "border-brand bg-panel shadow-pixel" : "border-edge-soft bg-panel-soft"
                    }`}
                  >
                    <h3 className="m-0">
                      <button
                        type="button"
                        onClick={() => alternar(item.id)}
                        aria-expanded={aberto}
                        aria-controls={painel}
                        className="group flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-panel"
                      >
                        <span className="flex min-w-0 flex-col gap-1.5">
                          {"categoria" in item ? (
                            <span className={`${TIPO.etiqueta} text-brand-light`}>
                              {item.categoria.titulo.toUpperCase()}
                            </span>
                          ) : null}
                          <span
                            className={`font-body text-[18px] font-semibold leading-[1.5] ${
                              aberto ? "text-ink" : "text-ink-body group-hover:text-ink"
                            }`}
                          >
                            {item.pergunta}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 shrink-0 font-label text-[16px] text-brand transition-transform motion-reduce:transition-none ${
                            aberto ? "rotate-45" : ""
                          }`}
                        >
                          +
                        </span>
                      </button>
                    </h3>
                    {aberto ? (
                      <div
                        id={painel}
                        className={`border-t-2 border-edge px-4 py-4 ${TIPO.corpo} text-ink-body text-pretty`}
                      >
                        {renderizarResposta(item.resposta)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
