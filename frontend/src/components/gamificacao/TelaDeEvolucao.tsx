"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A animação de evolução, em cima de um relógio só.
 *
 * Reimplementa a composição do protótipo sem o runtime dele: um
 * `requestAnimationFrame` avança o tempo e todo o resto é função desse tempo.
 * Manter um relógio único é o que impede sprite, faíscas e HUD de saírem de
 * sincronia, que é o que aconteceria com várias animações CSS independentes.
 */

// As cenas do protótipo, em segundos de duração.
const CENAS = {
  parado: 0.9,
  carga: 1.2,
  clarao: 0.5,
  revelacao: 1.0,
  assenta: 1.4,
} as const;

// Momento em que cada cena começa, acumulado.
const CARGA = CENAS.parado;
const CLARAO = CARGA + CENAS.carga;
const REVELACAO = CLARAO + CENAS.clarao;
const ASSENTA = REVELACAO + CENAS.revelacao;
const FIM = ASSENTA + CENAS.assenta;

const GRADE = 4; // o movimento anda de 4 em 4 px, para não sair do pixel
const FAISCAS = 26;
const CORES = ["#ffffff", "#d7b9ff", "#a855f7", "#ffb03a"];

const px = (v: number) => Math.round(v / GRADE) * GRADE;
const limitar = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

/** Ruído determinístico: a mesma faísca cai sempre no mesmo lugar. */
function ruido(i: number, semente: number): number {
  const x = Math.sin(i * 127.1 + semente * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const suaveSaida = (p: number) => 1 - (1 - p) ** 3;
const aceleraEntrada = (p: number) => p * p;
function estoura(p: number): number {
  const c = 1.70158 + 1;
  return 1 + c * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
}

/** Interpola de `de` a `para` entre dois instantes, com aceleração opcional. */
function entre(
  t: number,
  inicio: number,
  fim: number,
  de: number,
  para: number,
  curva: (p: number) => number = (p) => p,
): number {
  if (t <= inicio) return de;
  if (t >= fim) return para;
  return de + (para - de) * curva((t - inicio) / (fim - inicio));
}

interface Faisca {
  x: number;
  y: number;
  lado: number;
  cor: string;
  opacidade: number;
}

/** `dentro` converge para o centro na carga; `fora` se dispersa na revelação. */
function faiscas(
  t: number,
  de: number,
  ate: number,
  quantas: number,
  sentido: "dentro" | "fora",
): Faisca[] {
  const semente = sentido === "dentro" ? 1 : 2;
  const saida: Faisca[] = [];

  for (let i = 0; i < quantas; i++) {
    const comeca = de + ruido(i, semente) * Math.max(0.06, ate - de - 0.45);
    const acaba = comeca + 0.4 + ruido(i, semente + 5) * 0.25;
    if (t < comeca || t > acaba) continue;

    const p = (t - comeca) / (acaba - comeca);
    const angulo = ruido(i, semente + 2) * Math.PI * 2;
    const longe = 105 + ruido(i, semente + 3) * 55;
    const raio =
      sentido === "dentro"
        ? longe + (14 - longe) * aceleraEntrada(p)
        : 24 + (longe - 24) * suaveSaida(p);
    const lado = ruido(i, semente + 4) > 0.6 ? 8 : 4;

    saida.push({
      x: px(Math.cos(angulo) * raio - lado / 2),
      y: px(
        Math.sin(angulo) * raio * 0.9 -
          lado / 2 -
          (sentido === "dentro" ? p * 8 : p * 26),
      ),
      lado,
      cor: CORES[i % CORES.length],
      opacidade: sentido === "dentro" ? (p < 0.15 ? p / 0.15 : 1) : 1 - p,
    });
  }
  return saida;
}

/** O relógio. Para no fim em vez de repetir: isto não é um loop decorativo. */
function useRelogio(rodando: boolean): number {
  const [t, setT] = useState(0);
  const inicio = useRef<number | null>(null);

  useEffect(() => {
    if (!rodando) return;

    // Quem pediu menos movimento vê o resultado, não a transformação: salta
    // direto para o fim. Vai num quadro em vez de direto no corpo do efeito,
    // que dispararia uma renderização em cascata.
    const menosMovimento = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let quadro = requestAnimationFrame(
      menosMovimento
        ? () => setT(FIM)
        : function passo(agora: number) {
            inicio.current ??= agora;
            const decorrido = (agora - inicio.current) / 1000;
            setT(Math.min(decorrido, FIM));
            if (decorrido < FIM) quadro = requestAnimationFrame(passo);
          },
    );

    return () => cancelAnimationFrame(quadro);
  }, [rodando]);

  return t;
}

export function TelaDeEvolucao({
  nome,
  spriteAntes,
  spriteDepois,
  estagioAntes,
  estagioDepois,
  aoFechar,
}: {
  nome: string;
  spriteAntes: string | null;
  spriteDepois: string | null;
  estagioAntes: number;
  estagioDepois: number;
  aoFechar: () => void;
}) {
  const t = useRelogio(true);

  const carga = limitar((t - CARGA) / (CLARAO - CARGA));
  const clarao =
    t < CLARAO
      ? entre(t, CLARAO - 0.12, CLARAO, 0, 1)
      : entre(t, CLARAO, REVELACAO + 0.3, 1, 0);

  const opacidadeAntes = t < CLARAO ? 1 : entre(t, CLARAO, CLARAO + 0.08, 1, 0);
  const opacidadeDepois =
    t < CLARAO ? 0 : entre(t, CLARAO, CLARAO + 0.08, 0, 1);
  // A forma nova entra branca e vai ganhando cor conforme o brilho se dissipa.
  const branco = limitar(entre(t, CLARAO + 0.2, REVELACAO + 0.45, 1, 0));

  const tremor =
    carga > 0 && t < CLARAO
      ? (Math.round(Math.sin(t * 46) * carga * 2) * GRADE) / 2
      : 0;
  const escala =
    t < CLARAO
      ? 1 + carga * 0.05
      : entre(t, CLARAO, CLARAO + 0.5, 0.88, 1, estoura);

  const aura =
    t < CLARAO ? carga : limitar(entre(t, CLARAO, REVELACAO + 0.25, 1, 0));
  const auraLado = px(32 + (236 - 32) * aceleraEntrada(aura));
  const explosao = px(120 + (520 - 120) * suaveSaida(clarao));

  const moldura = entre(t, 0, 0.4, 0.35, 1, suaveSaida);
  const brilhoMoldura = Math.max(carga * 0.8, clarao);
  const estagioAgora = t < CLARAO ? estagioAntes : estagioDepois;
  const botao = limitar(
    entre(t, REVELACAO + 0.25, ASSENTA + 0.2, 0, 1, estoura),
  );
  const terminou = t >= FIM;

  const sprite = (src: string | null, opacidade: number, filtro: string) =>
    src ? (
      <Image
        src={src}
        alt=""
        width={224}
        height={224}
        className="absolute h-[224px] w-[224px] max-w-none"
        style={{
          left: "calc(50% - 112px)",
          top: "calc(50% - 112px)",
          imageRendering: "pixelated",
          opacity: opacidade,
          filter: filtro,
        }}
      />
    ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${nome} evoluiu para o estágio ${estagioDepois}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 p-4"
    >
      <div
        className="relative flex w-full max-w-[640px] flex-col items-center gap-6 border-[6px] border-brand bg-panel-deep px-6 py-10 sm:px-10"
        style={{
          opacity: moldura,
          boxShadow: `0 0 0 4px rgba(168,63,240,${0.15 + brilhoMoldura * 0.5})`,
        }}
      >
        <p className="m-0 font-display text-sm leading-[1.7] tracking-[4px] text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-lg">
          ESTÁGIO {estagioAntes} &gt; {estagioDepois}
        </p>

        {/* caixa do sprite: tudo que transborda fica preso aqui dentro */}
        <div className="relative h-[260px] w-[260px] overflow-hidden border-[6px] border-brand bg-[#191621] sm:h-[300px] sm:w-[300px]">
          <span
            aria-hidden="true"
            className="absolute bg-[#ffb03a]"
            style={{
              left: `calc(50% - ${auraLado / 2}px)`,
              top: `calc(50% - ${auraLado / 2}px)`,
              width: auraLado,
              height: auraLado,
              opacity: aura * 0.3,
            }}
          />
          <span
            aria-hidden="true"
            className="absolute bg-[#fff6c8]"
            style={{
              left: `calc(50% - ${auraLado / 4}px)`,
              top: `calc(50% - ${auraLado / 4}px)`,
              width: auraLado / 2,
              height: auraLado / 2,
              opacity: aura * 0.4,
            }}
          />

          <div
            className="absolute inset-0"
            style={{ transform: `translateX(${tremor}px) scale(${escala})` }}
          >
            {sprite(
              spriteAntes,
              opacidadeAntes,
              `brightness(${1 + carga * 1.6}) saturate(${1 - carga * 0.5})`,
            )}
            {sprite(
              spriteDepois,
              opacidadeDepois,
              `brightness(${1 + branco * 6}) saturate(${1 - branco}) contrast(${1 + branco * 0.5})`,
            )}
          </div>

          {[
            ...faiscas(t, CARGA, CLARAO, FAISCAS, "dentro"),
            ...faiscas(
              t,
              REVELACAO,
              ASSENTA + 0.5,
              Math.round(FAISCAS * 0.6),
              "fora",
            ),
          ].map((f, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute"
              style={{
                left: `calc(50% + ${f.x}px)`,
                top: `calc(50% + ${f.y}px)`,
                width: f.lado,
                height: f.lado,
                background: f.cor,
                opacity: f.opacidade,
              }}
            />
          ))}

          <span
            aria-hidden="true"
            className="absolute bg-white"
            style={{
              left: `calc(50% - ${explosao / 2}px)`,
              top: `calc(50% - ${explosao / 2}px)`,
              width: explosao,
              height: explosao,
              opacity: clarao * 0.95,
            }}
          />
        </div>

        <p className="m-0 font-label text-[12px] tracking-[2px] text-brand-light uppercase">
          {nome} · estágio {estagioAgora}
        </p>

        <button
          type="button"
          onClick={aoFechar}
          // Fica fora do alcance do teclado enquanto não chegou: um botão
          // invisível e focável some do fluxo de quem navega por tab.
          tabIndex={terminou ? 0 : -1}
          aria-hidden={terminou ? undefined : true}
          className="cursor-pointer border-[3px] border-brand-light bg-brand-deep px-8 py-4 font-display text-xs leading-[1.7] tracking-[2px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
          style={{ opacity: botao, transform: `scale(${0.9 + botao * 0.1})` }}
        >
          Continuar
        </button>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-white"
          style={{ opacity: clarao * 0.18 }}
        />
      </div>
    </div>
  );
}
