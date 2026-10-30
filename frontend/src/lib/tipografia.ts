import localFont from "next/font/local";

// Fonte oficial do sistema em um lugar so: as familias (next/font) e as classes
// de cada nivel tipografico, tiradas das telas de inicio, termos e privacidade.
// Trocar uma fonte ou um tamanho e edicao so aqui.

// Fontes locais pra não depender do Google Fonts (quebrava em rede restrita).

const pressStart = localFont({
  src: "../fontes/press-start-2p.woff2",
  variable: "--fonte-display",
  display: "swap",
  weight: "400",
  fallback: ["monospace"],
});

const silkscreen = localFont({
  src: "../fontes/silkscreen.woff2",
  variable: "--fonte-rotulo",
  display: "swap",
  weight: "400",
  fallback: ["monospace"],
});

const vt323 = localFont({
  src: "../fontes/vt323.woff2",
  variable: "--fonte-terminal",
  display: "swap",
  weight: "400",
  fallback: ["monospace"],
});

// Corpo de texto: fonte variável (um arquivo cobre 400-900). A pixelada VT323
// ficava dificil de ler em paragrafo; o pixel segue nos titulos e rotulos.
const inter = localFont({
  src: "../fontes/inter.woff2",
  variable: "--fonte-corpo",
  display: "swap",
  weight: "100 900",
  fallback: ["system-ui", "sans-serif"],
  // A Inter tem x-height maior que a VT323 (condensada), entao no mesmo tamanho
  // "parece" maior. size-adjust encolhe so os glifos da Inter, sem mexer no
  // layout nem nas fontes pixel. Ajuste fino da leitura em um lugar so.
  declarations: [{ prop: "size-adjust", value: "90%" }],
});

// Vai no <html>: define as variaveis --fonte-* que o @theme do globals.css le.
export const variaveisDasFontes = `${pressStart.variable} ${silkscreen.variable} ${vt323.variable} ${inter.variable}`;

// Classes por nivel. Cada valor e o literal exato que as telas usavam: o
// Tailwind gera a classe a partir do texto, entao um caractere a mais muda a tela.
export const TIPO = {
  tituloPagina: "font-display text-[17px] leading-[1.7] tracking-[1px]",
  tituloSecao: "font-display text-[13px] leading-[1.8] tracking-[1px]",
  corpo: "font-body text-lg leading-[1.8] tracking-[1px]",
  destaque: "font-body text-[21px] leading-[1.5]",
  sobretitulo: "font-label text-[11px] tracking-[0.2em]",
  etiqueta: "font-label text-[10px] tracking-[2px]",
} as const;
