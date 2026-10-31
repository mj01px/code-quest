"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CriacaoRapida } from "@/components/autoria/CriacaoRapida";
import { FilaRevisao } from "@/components/autoria/FilaRevisao";
import { ListaAprovados } from "@/components/autoria/ListaAprovados";
import { ListaRascunhos } from "@/components/autoria/ListaRascunhos";
import { MeusEnvios } from "@/components/autoria/MeusEnvios";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { IconeLapis } from "@/components/ui/Icone";
import { TIPO } from "@/lib/tipografia";

type Lista = "rascunhos" | "aprovados" | "fila";
type Aba = "producao" | "revisao" | "envios";

// Ordem das abas na tela.
const ORDEM: readonly Aba[] = ["producao", "revisao", "envios"];

// Cabeçalho e aba mudam juntos: produção e envios são do autor, a fila do revisor.
const ABAS: Record<Aba, { rotulo: string; titulo: string; subtitulo: string }> = {
  producao: {
    rotulo: "CRIAÇÃO E PUBLICAÇÃO",
    titulo: "Produção de Conteúdo",
    subtitulo: "Crie conteúdo, envie rascunhos para revisão e publique o que foi aprovado.",
  },
  revisao: {
    rotulo: "REVISÃO DE CONTEÚDO",
    titulo: "Revisão de Conteúdo",
    subtitulo: "Aprove ou devolva o que chegou na fila, com o motivo para o autor.",
  },
  envios: {
    rotulo: "MEUS ENVIOS",
    titulo: "Meus Envios e Feedback",
    subtitulo: "Acompanhe o que espera revisão, o que voltou para correção e o que foi excluído.",
  },
};

// Resumo do topo: a lista com itens aparece inteira abaixo; a vazia vira só
// esta linha. Classes literais: o Tailwind só gera o que lê escrito.
const RESUMO: Record<Exclude<Lista, "fila">, { titulo: string; vazio: string; cor: string }> = {
  rascunhos: {
    titulo: "Rascunhos",
    vazio: "Nenhum rascunho esperando envio.",
    cor: "border-brand text-brand-light",
  },
  aprovados: {
    titulo: "Prontos para publicar",
    vazio: "Nada aprovado esperando publicação.",
    cor: "border-success text-success",
  },
};

// Guarda de navegação, como no /admin: cada painel só aparece com a permissão
// da rota que ele consome. Quem barra de verdade é o backend (HasPerm).
export function PainelAutoria() {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();
  // Submeter leva o item para a fila e devolver o traz de volta. Trocar a
  // `key` remonta a outra lista, que busca de novo.
  // ponytail: remontar descarta uma ação em voo na outra lista (resposta e
  // erro somem); só afeta quem tem as duas permissões e age nas duas ao mesmo
  // tempo. Subir `ocupado` para cá se isso aparecer.
  const [versaoRascunhos, setVersaoRascunhos] = useState(0);
  const [versaoFila, setVersaoFila] = useState(0);
  const [versaoAprovados, setVersaoAprovados] = useState(0);
  const [abaEscolhida, setAbaEscolhida] = useState<Aba>("producao");
  // Total de cada lista, contado por ela mesma; ausente enquanto carrega.
  const [contagens, setContagens] = useState<Partial<Record<Lista, number>>>({});
  // Um contador estável por lista: a lista o chama num efeito, e uma função
  // nova a cada render o redispararia à toa.
  const [contar] = useState(() => {
    const para = (lista: Lista) => (total: number) =>
      setContagens((atual) => (atual[lista] === total ? atual : { ...atual, [lista]: total }));
    return { rascunhos: para("rascunhos"), aprovados: para("aprovados"), fila: para("fila") };
  });

  const permissoes = usuario?.permissoes ?? [];
  const podeSubmeter = permissoes.includes("trilhas.submit_review");
  const podeRevisar = permissoes.includes("trilhas.review");
  const podeCriar = permissoes.includes("trilhas.create");
  const podeCriarTrilha = podeCriar && permissoes.includes("trilhas.create_trilha");
  const temAcesso = podeSubmeter || podeRevisar;

  // Cada aba segue a permissão da rota que consome. Quem só revisa fica só com
  // a fila, sem barra de abas.
  const disponivel: Record<Aba, boolean> = {
    producao: podeSubmeter,
    revisao: podeRevisar,
    envios: podeSubmeter,
  };
  const abas = ORDEM.filter((id) => disponivel[id]);
  const aba: Aba = disponivel[abaEscolhida] ? abaEscolhida : (abas[0] ?? "producao");
  const comAbas = abas.length > 1;
  const producao: Exclude<Lista, "fila">[] = podeSubmeter ? ["rascunhos", "aprovados"] : [];
  const producaoContada = producao.every((l) => contagens[l] !== undefined);
  const producaoVazia = producaoContada && producao.every((l) => contagens[l] === 0);
  const totalFila = contagens.fila ?? 0;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/entrar");
    else if (!temAcesso) router.replace("/trilhas");
  }, [carregando, usuario, temAcesso, router]);

  if (carregando || !usuario) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-brand-light">
        &gt; VERIFICANDO ACESSO...
      </p>
    );
  }

  if (!temAcesso) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-ink-muted">
        &gt; ACESSO RESTRITO. REDIRECIONANDO...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Ordem: título, subtítulo, abas, divisória e o conteúdo da aba ativa. */}
      <div className="flex flex-col gap-3">
        <span className={`text-brand ${TIPO.sobretitulo}`}>{"// AUTORIA"}</span>
        <h1 className={`m-0 text-ink ${TIPO.tituloPagina}`}>{ABAS[aba].titulo}</h1>
        <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>{ABAS[aba].subtitulo}</p>
      </div>

      {comAbas ? (
        <div
          role="tablist"
          aria-label="Fluxo editorial"
          className="flex overflow-x-auto border-b-2 border-edge"
        >
          {abas.map((id) => {
            const ativa = id === aba;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`aba-${id}`}
                aria-selected={ativa}
                aria-controls={`painel-${id}`}
                onClick={() => setAbaEscolhida(id)}
                className={`flex cursor-pointer items-center gap-3 border-b-[3px] px-5 py-4 font-label text-[11px] tracking-[2px] ${ativa ? "border-brand-light text-ink" : "border-transparent text-ink-dim hover:text-ink-muted"}`}
              >
                {ABAS[id].rotulo}
                {id === "revisao" && totalFila > 0 ? (
                  <span className="border-2 border-warning px-2 text-warning">{totalFila}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Produção e fila ficam montadas (a inativa só escondida): a fila conta
          sozinha e o selo da aba aparece sem precisar abri-la. */}
      {podeSubmeter ? (
        <div
          role={comAbas ? "tabpanel" : undefined}
          id="painel-producao"
          aria-labelledby={comAbas ? "aba-producao" : undefined}
          hidden={aba !== "producao"}
        >
          <div className="flex flex-col gap-8">
            {/* Só na aba de criação: nas outras nem monta. */}
            {aba === "producao" ? (
              <CriacaoRapida
                permissoes={permissoes}
                aoCriar={() => setVersaoRascunhos((v) => v + 1)}
              />
            ) : null}
            {producaoVazia ? (
              <div className="flex flex-col items-center gap-4 border-2 border-dashed border-edge-soft bg-panel px-6 py-14 text-center">
                <span className="flex h-20 w-20 items-center justify-center border-[3px] border-brand bg-panel-deep text-brand-light shadow-pixel">
                  <IconeLapis className="h-10 w-10" />
                </span>
                {podeCriarTrilha ? (
                  <>
                    <p className={`m-0 text-ink ${TIPO.tituloSecao}`}>
                      Seu espaço de criação está pronto!
                    </p>
                    <p className={`m-0 max-w-prose text-ink-muted ${TIPO.corpo}`}>
                      Comece criando uma nova trilha.
                    </p>
                  </>
                ) : (
                  <p className={`m-0 text-ink ${TIPO.tituloSecao}`}>
                    Tudo em dia! Nenhum conteúdo pendente.
                  </p>
                )}
              </div>
            ) : producaoContada ? (
              <ul aria-label="Resumo" className="m-0 flex list-none flex-wrap gap-3 p-0">
                {producao.map((lista) => {
                  const total = contagens[lista] ?? 0;
                  const { titulo, vazio, cor } = RESUMO[lista];
                  return (
                    <li
                      key={lista}
                      title={total === 0 ? vazio : undefined}
                      className={`flex items-center gap-3 border-2 bg-panel px-3 py-2 ${total === 0 ? "border-edge text-ink-dim" : cor}`}
                    >
                      <span className={TIPO.etiqueta}>{titulo}</span>
                      <span className={`border-2 px-2 ${total === 0 ? "border-edge" : cor} ${TIPO.etiqueta}`}>
                        {total}
                      </span>
                      {total === 0 ? <span className="sr-only">{vazio}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {/* Só as listas com itens aparecem (a vazia some sozinha), uma abaixo da outra. */}
            <div className="flex flex-col gap-6">
              <ListaRascunhos
                key={`rascunhos-${versaoRascunhos}`}
                aoSubmeter={() => setVersaoFila((v) => v + 1)}
                // Editar e excluir são de quem cria (trilhas.create), como no backend.
                aoAlterar={podeCriar ? () => setVersaoRascunhos((v) => v + 1) : undefined}
                aoContar={contar.rascunhos}
              />
              <ListaAprovados
                key={`aprovados-${versaoAprovados}`}
                aoAlterar={podeCriar ? () => setVersaoAprovados((v) => v + 1) : undefined}
                aoContar={contar.aprovados}
              />
            </div>
          </div>
        </div>
      ) : null}

      {podeRevisar ? (
        <div
          role={comAbas ? "tabpanel" : undefined}
          id="painel-revisao"
          aria-labelledby={comAbas ? "aba-revisao" : undefined}
          hidden={aba !== "revisao"}
        >
          {contagens.fila === 0 ? (
            <div className="flex flex-col items-center gap-4 border-2 border-dashed border-edge-soft bg-panel px-6 py-14 text-center">
              <span className="flex h-20 w-20 items-center justify-center border-[3px] border-success bg-panel-deep text-success shadow-pixel">
                <IconeLapis className="h-10 w-10" />
              </span>
              <p className={`m-0 text-ink ${TIPO.tituloSecao}`}>
                Tudo em dia! Nenhum conteúdo pendente para revisão.
              </p>
            </div>
          ) : null}
          <FilaRevisao
            key={`fila-${versaoFila}`}
            aoDevolver={() => setVersaoRascunhos((v) => v + 1)}
            aoAprovar={() => setVersaoAprovados((v) => v + 1)}
            aoContar={contar.fila}
          />
        </div>
      ) : null}

      {/* Monta só aberta: cada visita busca o retorno da revisão de novo. */}
      {aba === "envios" ? (
        <div
          role={comAbas ? "tabpanel" : undefined}
          id="painel-envios"
          aria-labelledby={comAbas ? "aba-envios" : undefined}
        >
          <MeusEnvios />
        </div>
      ) : null}
    </div>
  );
}
