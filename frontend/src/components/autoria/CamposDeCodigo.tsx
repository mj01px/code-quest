"use client";

import { ROTULO } from "@/components/autoria/AreaDeTexto";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import type { CasoEditorial, NovoCaso } from "@/lib/types";

// O que o autor digita em cada caso, antes de virar JSON. `visivel` só vem
// de um caso já salvo: a criação deixa o backend decidir.
export interface CasoTexto {
  argumentos: string;
  esperado: string;
  visivel?: boolean;
}

export const CASO_VAZIO: CasoTexto = { argumentos: "", esperado: "" };

export const ERRO_CASO =
  'Cada caso precisa de argumentos e esperado em JSON (ex.: 8, 6 e 7.0; texto vai entre aspas: "oi").';

// Argumentos vêm sem colchetes ("8, 6") e viram a lista que o corretor espera.
export function lerCasos(casos: CasoTexto[]): NovoCaso[] | null {
  try {
    return casos.map((c) => ({
      argumentos: JSON.parse(`[${c.argumentos}]`) as unknown[],
      esperado: JSON.parse(c.esperado) as unknown,
      ...(c.visivel === undefined ? {} : { visivel: c.visivel }),
    }));
  } catch {
    return null;
  }
}

// O caminho inverso, para preencher o formulário com os casos salvos.
export const casosDeTexto = (testes: CasoEditorial[]): CasoTexto[] =>
  testes.map((t) => ({
    argumentos: JSON.stringify(t.argumentos).slice(1, -1),
    esperado: JSON.stringify(t.esperado),
    visivel: t.visivel,
  }));

export const casosIncompletos = (casos: CasoTexto[]) => casos.some((c) => !c.esperado.trim());

// Função que o aluno implementa e os casos que o corretor roda nela.
export function CamposDeCodigo({
  funcao,
  aoMudarFuncao,
  casos,
  aoMudarCasos,
}: {
  funcao: string;
  aoMudarFuncao: (funcao: string) => void;
  casos: CasoTexto[];
  aoMudarCasos: (casos: CasoTexto[]) => void;
}) {
  function mudarCaso(i: number, campo: "argumentos" | "esperado", valor: string) {
    aoMudarCasos(casos.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }

  return (
    <>
      <PixelField
        rotulo="NOME DA FUNÇÃO (EX: MEDIA)"
        value={funcao}
        maxLength={60}
        onChange={(e) => aoMudarFuncao(e.target.value)}
      />
      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className={`mb-2 ${ROTULO}`}>CASOS DE TESTE</legend>
        {casos.map((caso, i) => (
          <div key={i} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <PixelField
              rotulo={`ARGUMENTOS ${i + 1} (EX: 8, 6)`}
              value={caso.argumentos}
              onChange={(e) => mudarCaso(i, "argumentos", e.target.value)}
            />
            <PixelField
              rotulo={`ESPERADO ${i + 1} (EX: 7.0)`}
              value={caso.esperado}
              onChange={(e) => mudarCaso(i, "esperado", e.target.value)}
            />
            <PixelButton
              type="button"
              variante="secundaria"
              aria-label={`Remover caso ${i + 1}`}
              disabled={casos.length === 1}
              onClick={() => aoMudarCasos(casos.filter((_, j) => j !== i))}
            >
              REMOVER
            </PixelButton>
          </div>
        ))}
        <PixelButton
          type="button"
          variante="secundaria"
          className="self-start"
          onClick={() => aoMudarCasos([...casos, CASO_VAZIO])}
        >
          + CASO DE TESTE
        </PixelButton>
      </fieldset>
    </>
  );
}
