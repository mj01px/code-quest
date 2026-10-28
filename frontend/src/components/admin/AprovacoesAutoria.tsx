"use client";

import { useEffect, useState } from "react";

import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { SolicitacaoAdmin } from "@/lib/types";

const BOTAO =
  "cursor-pointer border-2 px-4 py-2 font-label text-[11px] tracking-[2px] uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

type Decisao = { tipo: "aprovar" | "rejeitar"; pedido: SolicitacaoAdmin };

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ErroApi ? erro.message : padrao;
}

// Fila de pedidos de autoria. Aprovar dá o nível "Autor" ao aluno; rejeitar
// exige motivo, que o aluno vê na tela /ser-autor.
export function AprovacoesAutoria() {
  const [pedidos, setPedidos] = useState<SolicitacaoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .adminSolicitacoes()
      .then((lista) => {
        if (ativo) setPedidos(lista);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDe(e, "Não foi possível carregar as solicitações."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  function abrir(tipo: Decisao["tipo"], pedido: SolicitacaoAdmin) {
    setDecisao({ tipo, pedido });
    setMotivo("");
    setErroModal(null);
  }

  async function confirmar() {
    if (!decisao) return;
    const { tipo, pedido } = decisao;
    setEnviando(true);
    setErroModal(null);
    try {
      if (tipo === "aprovar") await api.aprovarSolicitacao(pedido.id);
      else await api.rejeitarSolicitacao(pedido.id, motivo.trim());
      setPedidos((atual) => atual.filter((p) => p.id !== pedido.id));
      setDecisao(null);
    } catch (e) {
      setErroModal(mensagemDe(e, "Não foi possível concluir a ação."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-label="Solicitações de autoria" className="flex flex-col gap-4">
      <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>Solicitações de autoria</h2>

      {erro ? (
        <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
          {erro}
        </p>
      ) : carregando ? (
        <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO...</p>
      ) : pedidos.length === 0 ? (
        <p className={`m-0 text-ink-dim ${TIPO.corpo}`}>
          Nenhuma solicitação esperando análise.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {pedidos.map((pedido) => (
            <li
              key={pedido.id}
              className="flex flex-col gap-3 border-2 border-edge bg-panel p-5 shadow-pixel"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className={`text-ink ${TIPO.etiqueta}`}>
                  {pedido.solicitante.nickname}
                  <span className="ml-3 text-ink-muted">{pedido.solicitante.email}</span>
                </span>
                <span className={`text-ink-dim ${TIPO.etiqueta}`}>
                  {new Date(pedido.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <span className={`text-brand-light ${TIPO.etiqueta}`}>
                {pedido.areas_nomes.join(" · ").toUpperCase()}
              </span>
              <p className={`m-0 whitespace-pre-wrap text-ink-body ${TIPO.corpo}`}>
                {pedido.carta_apresentacao}
              </p>
              {pedido.portfolio_link ? (
                <a
                  href={pedido.portfolio_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`break-all text-brand-light underline underline-offset-4 ${TIPO.etiqueta}`}
                >
                  {pedido.portfolio_link}
                </a>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => abrir("aprovar", pedido)}
                  aria-label={`Aprovar: ${pedido.solicitante.nickname}`}
                  className={`${BOTAO} border-brand-light bg-brand-deep text-ink hover:bg-brand-strong`}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => abrir("rejeitar", pedido)}
                  aria-label={`Rejeitar: ${pedido.solicitante.nickname}`}
                  className={`${BOTAO} border-danger text-danger hover:bg-danger-deep`}
                >
                  Rejeitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decisao ? (
        <ModalConfirmacao
          rotulo="AUTORIA"
          titulo={
            decisao.tipo === "aprovar"
              ? `Aprovar ${decisao.pedido.solicitante.nickname}?`
              : `Rejeitar ${decisao.pedido.solicitante.nickname}?`
          }
          textoConfirmar={decisao.tipo === "aprovar" ? "APROVAR" : "REJEITAR"}
          perigo={decisao.tipo === "rejeitar"}
          carregando={enviando}
          confirmarDesabilitado={decisao.tipo === "rejeitar" && motivo.trim() === ""}
          erro={erroModal}
          onConfirmar={confirmar}
          onFechar={() => setDecisao(null)}
        >
          {decisao.tipo === "aprovar" ? (
            <p className="m-0">
              O usuário passa a ter o nível Autor e pode criar trilhas, aulas e
              exercícios. Todo conteúdo dele ainda passa pela revisão.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="motivo-rejeicao"
                className="font-label text-[11px] tracking-[2px] text-ink-muted"
              >
                MOTIVO (O ALUNO VAI VER)
              </label>
              <textarea
                id="motivo-rejeicao"
                rows={4}
                maxLength={1000}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="resize-y border-2 border-brand-strong bg-field px-3.5 py-3 font-body text-[15px] leading-[1.6] text-ink shadow-pixel outline-none focus:border-brand-pale"
              />
            </div>
          )}
        </ModalConfirmacao>
      ) : null}
    </section>
  );
}
