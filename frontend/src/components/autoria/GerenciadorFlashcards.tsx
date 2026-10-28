"use client";

import { useId, useState } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import { CartaoFlashcard } from "@/components/trilhas/CartaoFlashcard";
import { PixelButton } from "@/components/ui/PixelButton";
import { IconeLapis, IconeLixeira } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { Flashcard } from "@/lib/types";

const BOTAO_ICONE =
  "flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-edge-soft text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

function mensagemDe(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return "Não foi possível salvar o card.";
  return Object.values(erro.porCampo())[0] ?? erro.message;
}

// Baralho da aula em rascunho. Cada card vai para a API na hora: a aula já
// existe, e o card some junto com ela se o rascunho for excluído.
export function GerenciadorFlashcards({
  aula,
  iniciais = [],
}: {
  aula: number;
  iniciais?: Flashcard[];
}) {
  const id = useId();
  const [cards, setCards] = useState(iniciais);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    setPergunta("");
    setResposta("");
    setEditando(null);
  }

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  }

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    const dados = { pergunta: pergunta.trim(), resposta: resposta.trim() };
    void executar(async () => {
      if (editando === null) {
        const novo = await api.criarFlashcard({ aula, ...dados });
        setCards((atual) => [...atual, novo]);
      } else {
        const salvo = await api.editarFlashcard(editando, dados);
        setCards((atual) => atual.map((c) => (c.id === salvo.id ? salvo : c)));
      }
      limpar();
    });
  }

  function editar(card: Flashcard) {
    setEditando(card.id);
    setPergunta(card.pergunta);
    setResposta(card.resposta);
  }

  function remover(card: Flashcard) {
    void executar(async () => {
      await api.excluirFlashcard(card.id);
      setCards((atual) => atual.filter((c) => c.id !== card.id));
      if (editando === card.id) limpar();
    });
  }

  return (
    <section aria-label="Flashcards da aula" className="flex flex-col gap-4">
      <span className={`text-brand-light ${TIPO.etiqueta}`}>
        FLASHCARDS · {cards.length}
      </span>

      {cards.length > 0 ? (
        <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id} className="flex flex-col gap-2">
              <CartaoFlashcard card={card} />
              <span className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => editar(card)}
                  aria-label={`Editar card: ${card.pergunta}`}
                  className={BOTAO_ICONE}
                >
                  <IconeLapis className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => remover(card)}
                  aria-label={`Excluir card: ${card.pergunta}`}
                  className={`${BOTAO_ICONE} hover:border-danger hover:text-danger`}
                >
                  <IconeLixeira className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        onSubmit={salvar}
        aria-label={editando === null ? "Novo flashcard" : "Editar flashcard"}
        className="flex flex-col gap-4 border-2 border-dashed border-brand-shadow bg-panel-deep p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AreaDeTexto
            id={`${id}-pergunta`}
            rotulo="FRENTE (PERGUNTA)"
            rows={3}
            maxLength={500}
            disabled={ocupado}
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
          />
          <AreaDeTexto
            id={`${id}-resposta`}
            rotulo="VERSO (RESPOSTA)"
            rows={3}
            maxLength={1000}
            disabled={ocupado}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
          />
        </div>
        {erro ? (
          <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
            {erro}
          </p>
        ) : null}
        <span className="flex flex-wrap justify-end gap-3">
          {editando !== null ? (
            <PixelButton type="button" variante="secundaria" onClick={limpar}>
              CANCELAR
            </PixelButton>
          ) : null}
          <PixelButton
            type="submit"
            variante="secundaria"
            disabled={ocupado || !pergunta.trim() || !resposta.trim()}
          >
            {ocupado ? "SALVANDO..." : editando === null ? "+ ADICIONAR CARD" : "SALVAR CARD"}
          </PixelButton>
        </span>
      </form>
    </section>
  );
}
