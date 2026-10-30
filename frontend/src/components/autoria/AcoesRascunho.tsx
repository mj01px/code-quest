"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import { GerenciadorFlashcards } from "@/components/autoria/GerenciadorFlashcards";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { PixelField } from "@/components/ui/PixelField";
import { IconeLapis, IconeLixeira } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type {
  DetalheEditorial,
  EdicaoRascunho,
  ItemEditorial,
  TipoConteudo,
} from "@/lib/types";

export const BOTAO_ICONE =
  "flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-edge-soft text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

// A trilha não passa por aqui: o lápis dela abre o editor completo.
type TipoNoModal = Exclude<TipoConteudo, "trilhas">;

// Rótulo do segundo campo de cada tipo; o primeiro é sempre o título.
const TEXTO: Record<TipoNoModal, string> = {
  aulas: "TEXTO (MARKDOWN)",
  exercicios: "ENUNCIADO",
};

function camposDe(d: DetalheEditorial): { titulo: string; texto: string } | null {
  if ("enunciado" in d) return { titulo: d.titulo, texto: d.enunciado };
  if ("conteudo" in d) return { titulo: d.titulo, texto: d.conteudo };
  return null;
}

function corpoDe(tipo: TipoNoModal, titulo: string, texto: string): EdicaoRascunho {
  return tipo === "aulas" ? { titulo, conteudo: texto } : { titulo, enunciado: texto };
}

function mensagemDe(erro: unknown, padrao: string): string {
  if (!(erro instanceof ErroApi)) return padrao;
  return Object.values(erro.porCampo())[0] ?? erro.message;
}

// Lápis e lixeira de um rascunho. Os dois terminam em `aoAlterar`, que
// recarrega a lista: excluir uma trilha leva junto as aulas dela. O lápis da
// trilha é um link para o editor completo; o de aula e exercício abre o modal.
export function AcoesRascunho({
  item,
  aoAlterar,
  soExcluir = false,
}: {
  item: ItemEditorial;
  aoAlterar: () => void;
  /** Aprovado não se edita: só a lixeira. */
  soExcluir?: boolean;
}) {
  const id = useId();
  const noModal: TipoNoModal | null = item.tipo === "trilhas" ? null : item.tipo;
  const [modo, setModo] = useState<"editar" | "excluir" | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheEditorial | null>(null);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Leitura do rascunho que chega depois de fechar o modal é descartada: senão
  // ela grava erro no próximo modal ou atropela o que já foi digitado.
  const pedido = useRef(0);

  function fechar() {
    pedido.current += 1;
    setModo(null);
    setDetalhe(null);
    setErro(null);
  }

  async function abrirEdicao() {
    setModo("editar");
    const meu = ++pedido.current;
    try {
      const lido = await api.detalheEditorial(item.tipo, item.id);
      const campos = camposDe(lido);
      if (meu !== pedido.current || campos === null) return;
      setTitulo(campos.titulo);
      setTexto(campos.texto);
      setDetalhe(lido);
    } catch (e) {
      if (meu === pedido.current) {
        setErro(mensagemDe(e, "Não foi possível abrir o rascunho."));
      }
    }
  }

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      if (modo === "excluir") {
        await api.excluirRascunho(item.tipo, item.id);
      } else if (noModal !== null) {
        await api.editarRascunho(
          noModal,
          item.id,
          corpoDe(noModal, titulo.trim(), texto.trim()),
        );
      }
      fechar();
      aoAlterar();
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível concluir a ação."));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      {soExcluir ? null : noModal === null ? (
        <Link
          href={`/autoria/novo?trilha_id=${item.id}`}
          aria-label={`Editar: ${item.titulo}`}
          className={BOTAO_ICONE}
        >
          <IconeLapis className="h-4 w-4" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={abrirEdicao}
          aria-label={`Editar: ${item.titulo}`}
          className={BOTAO_ICONE}
        >
          <IconeLapis className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setModo("excluir")}
        aria-label={`Excluir: ${item.titulo}`}
        className={`${BOTAO_ICONE} hover:border-danger hover:text-danger`}
      >
        <IconeLixeira className="h-4 w-4" />
      </button>

      {modo === "excluir" ? (
        <ModalConfirmacao
          rotulo={soExcluir ? "EXCLUIR APROVADO" : "EXCLUIR RASCUNHO"}
          titulo={item.titulo}
          textoConfirmar="EXCLUIR"
          perigo
          carregando={ocupado}
          erro={erro}
          onConfirmar={confirmar}
          onFechar={fechar}
        >
          <p className="m-0">
            {soExcluir ? "O conteúdo aprovado" : "O rascunho"} será apagado de vez,
            junto com o que estiver dentro dele
            (aulas, exercícios e flashcards).
          </p>
        </ModalConfirmacao>
      ) : null}

      {modo === "editar" && noModal !== null ? (
        <ModalConfirmacao
          rotulo="EDITAR RASCUNHO"
          titulo={item.titulo}
          textoConfirmar="SALVAR"
          carregando={ocupado}
          confirmarDesabilitado={detalhe === null || !titulo.trim() || !texto.trim()}
          erro={erro}
          onConfirmar={confirmar}
          onFechar={fechar}
        >
          {detalhe === null ? (
            erro ? null : (
              <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO...</p>
            )
          ) : (
            <div className="flex flex-col gap-5">
              <PixelField
                rotulo="TÍTULO"
                value={titulo}
                maxLength={120}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <AreaDeTexto
                id={`${id}-texto`}
                rotulo={TEXTO[noModal]}
                markdown={noModal === "aulas"}
                rows={noModal === "aulas" ? 8 : 4}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              {"flashcards" in detalhe ? (
                <>
                  <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
                    Os cards são salvos na hora, à parte do botão SALVAR.
                  </p>
                  <GerenciadorFlashcards aula={item.id} iniciais={detalhe.flashcards} />
                </>
              ) : null}
            </div>
          )}
        </ModalConfirmacao>
      ) : null}
    </>
  );
}
