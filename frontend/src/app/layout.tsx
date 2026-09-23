import type { Metadata } from "next";

import localFont from "next/font/local";

import "./globals.css";

// Fontes locais pra não depender do Google Fonts (quebrava em rede restrita).

const pressStart = localFont({
  src: "../fontes/press-start-2p.woff2",
  variable: "--font-press-start",
  display: "swap",
  weight: "400",
  fallback: ["monospace"],
});

const silkscreen = localFont({
  src: "../fontes/silkscreen.woff2",
  variable: "--font-silkscreen",
  display: "swap",
  weight: "400",
  fallback: ["monospace"],
});

const vt323 = localFont({
  src: "../fontes/vt323.woff2",
  variable: "--font-vt323",
  display: "swap",
  weight: "400",
  fallback: ["monospace"],
});

// Corpo de texto: fonte variável (um arquivo cobre 400-900). A pixelada VT323
// ficava dificil de ler em paragrafo; o pixel segue nos titulos e rotulos.
const inter = localFont({
  src: "../fontes/inter.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  fallback: ["system-ui", "sans-serif"],
  // A Inter tem x-height maior que a VT323 (condensada), entao no mesmo tamanho
  // "parece" maior. size-adjust encolhe so os glifos da Inter, sem mexer no
  // layout nem nas fontes pixel. Ajuste fino da leitura em um lugar so.
  declarations: [{ prop: "size-adjust", value: "90%" }],
});

export const metadata: Metadata = {
  title: "CodeQuest",
  description:
    "Plataforma gamificada de ensino de programação. Seu progresso vira a evolução de uma criatura.",
  icons: { icon: "/marca/ovo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${pressStart.variable} ${silkscreen.variable} ${vt323.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="bg-void text-ink-soft min-h-full">{children}</body>
    </html>
  );
}
