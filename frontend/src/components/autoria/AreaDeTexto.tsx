"use client";

import { useRef } from "react";

const CAMPO_TEXTO =
  "resize-y border-2 border-brand-strong bg-field px-3.5 py-3 font-body text-[15px] leading-[1.6] text-ink shadow-pixel outline-none focus:border-brand-pale";

export const ROTULO = "font-label text-[12px] tracking-[2px] text-ink-label";

const BOTAO_FERRAMENTA =
  "min-h-11 min-w-11 cursor-pointer border-2 border-edge-soft bg-panel-deep px-3 font-terminal text-lg text-ink-soft transition-colors duration-150 hover:border-brand hover:text-ink focus-visible:border-brand-pale";

// [marca, nome acessível, o que aparece no botão]
const FERRAMENTAS: [string, string, string][] = [
  ["**", "Negrito", "B"],
  ["*", "Itálico", "I"],
  ["`", "Código", "</>"],
];

// O campo é controlado pelo pai: trocar o valor pelo setter nativo e disparar
// `input` faz o React chamar o onChange dele como se o autor tivesse digitado.
function envolver(campo: HTMLTextAreaElement, marca: string) {
  const { selectionStart: inicio, selectionEnd: fim, value } = campo;
  const novo = value.slice(0, inicio) + marca + value.slice(inicio, fim) + marca + value.slice(fim);
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(campo, novo);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.focus();
  // A seleção continua no mesmo texto, agora entre as marcas.
  campo.setSelectionRange(inicio + marca.length, fim + marca.length);
}

export function AreaDeTexto({
  id,
  rotulo,
  markdown = false,
  ...props
}: {
  id: string;
  rotulo: string;
  /** Mostra a barra de negrito, itálico e código acima do campo. */
  markdown?: boolean;
} & React.ComponentPropsWithoutRef<"textarea">) {
  const campo = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      {markdown ? (
        <div role="toolbar" aria-label="Formatação" aria-controls={id} className="flex gap-2">
          {FERRAMENTAS.map(([marca, nome, icone]) => (
            <button
              key={nome}
              type="button"
              aria-label={nome}
              title={nome}
              onClick={() => campo.current && envolver(campo.current, marca)}
              className={BOTAO_FERRAMENTA}
            >
              {icone}
            </button>
          ))}
        </div>
      ) : null}
      <textarea ref={campo} id={id} rows={4} className={CAMPO_TEXTO} {...props} />
    </div>
  );
}
