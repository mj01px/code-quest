"use client";

import { useId, useState } from "react";

import { BOTAO_ICONE } from "@/components/autoria/AcoesRascunho";
import { AreaDeTexto, ROTULO } from "@/components/autoria/AreaDeTexto";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { PixelField } from "@/components/ui/PixelField";
import { IconeLapis, IconeLixeira } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import type { Alternativa, Questao } from "@/lib/types";

export type DadosQuestao = Omit<Questao, "id">;

const ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D"];

export const QUESTAO_VAZIA: DadosQuestao = {
  enunciado: "",
  opcoes: ["", "", "", ""],
  resposta_correta: "A",
};

export const questaoCompleta = (q: DadosQuestao) =>
  Boolean(q.enunciado.trim()) && q.opcoes.every((o) => o.trim());

// Só os três campos: a questão lida traz também o `id`, que não vai no corpo.
export const questaoLimpa = (q: DadosQuestao): DadosQuestao => ({
  enunciado: q.enunciado.trim(),
  opcoes: q.opcoes.map((o) => o.trim()),
  resposta_correta: q.resposta_correta,
});

// Enunciado, as quatro opções e a correta: o mesmo na criação e na edição.
export function CamposQuestao({
  valor,
  aoMudar,
}: {
  valor: DadosQuestao;
  aoMudar: (q: DadosQuestao) => void;
}) {
  const id = useId();
  return (
    <>
      <AreaDeTexto
        id={`${id}-enunciado`}
        rotulo="ENUNCIADO DA QUESTÃO"
        rows={4}
        maxLength={1000}
        value={valor.enunciado}
        onChange={(e) => aoMudar({ ...valor, enunciado: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {ALTERNATIVAS.map((letra, i) => (
          <PixelField
            key={letra}
            rotulo={`OPÇÃO ${letra}`}
            value={valor.opcoes[i]}
            onChange={(e) =>
              aoMudar({
                ...valor,
                opcoes: valor.opcoes.map((o, j) => (j === i ? e.target.value : o)),
              })
            }
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-correta`} className={ROTULO}>
          RESPOSTA CORRETA
        </label>
        <select
          id={`${id}-correta`}
          value={valor.resposta_correta}
          onChange={(e) =>
            aoMudar({ ...valor, resposta_correta: e.target.value as Alternativa })
          }
          className="cursor-pointer border-2 border-brand-strong bg-field px-3 py-[11px] font-body text-[15px] text-ink shadow-pixel outline-none focus:border-brand-pale"
        >
          {ALTERNATIVAS.map((letra) => (
            <option key={letra} value={letra}>
              {letra}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function mensagemDe(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return "Não foi possível concluir a ação.";
  return Object.values(erro.porCampo())[0] ?? erro.message;
}

// Lápis e lixeira de uma questão da aula em rascunho. Os dois terminam em
// `aoAlterar`, que relê a aula.
export function AcoesQuestao({
  questao,
  aoAlterar,
}: {
  questao: Questao;
  aoAlterar: () => void;
}) {
  const [modo, setModo] = useState<"editar" | "excluir" | null>(null);
  const [dados, setDados] = useState<DadosQuestao>(questao);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrir(novo: "editar" | "excluir") {
    setDados(questao);
    setErro(null);
    setModo(novo);
  }

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      if (modo === "excluir") await api.excluirQuestao(questao.id);
      else await api.editarQuestao(questao.id, questaoLimpa(dados));
      setModo(null);
      aoAlterar();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => abrir("editar")}
        aria-label={`Editar: ${questao.enunciado}`}
        className={BOTAO_ICONE}
      >
        <IconeLapis className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => abrir("excluir")}
        aria-label={`Excluir: ${questao.enunciado}`}
        className={`${BOTAO_ICONE} hover:border-danger hover:text-danger`}
      >
        <IconeLixeira className="h-4 w-4" />
      </button>

      {modo === "excluir" ? (
        <ModalConfirmacao
          rotulo="EXCLUIR QUESTÃO"
          titulo={questao.enunciado}
          textoConfirmar="EXCLUIR"
          perigo
          carregando={ocupado}
          erro={erro}
          onConfirmar={confirmar}
          onFechar={() => setModo(null)}
        >
          <p className="m-0">A questão será apagada de vez.</p>
        </ModalConfirmacao>
      ) : null}

      {modo === "editar" ? (
        <ModalConfirmacao
          rotulo="EDITAR QUESTÃO"
          titulo={questao.enunciado}
          textoConfirmar="SALVAR"
          carregando={ocupado}
          confirmarDesabilitado={!questaoCompleta(dados)}
          erro={erro}
          onConfirmar={confirmar}
          onFechar={() => setModo(null)}
        >
          <div className="flex flex-col gap-5">
            <CamposQuestao valor={dados} aoMudar={setDados} />
          </div>
        </ModalConfirmacao>
      ) : null}
    </>
  );
}
