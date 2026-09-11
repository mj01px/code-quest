import type { Metadata } from "next";
import localFont from "next/font/local";

import { CHAVE, FECHADA } from "@/lib/preferenciaSidebar";

import "./globals.css";

// Fontes auto-hospedadas em vez de next/font/google: o build passa a não
// depender de alcançar o fonts.googleapis.com, o que quebrava silenciosamente
// em rede restrita e caía num fallback sem avisar em tempo de execução.

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

// Restaura a sidebar recolhida antes da primeira pintura. Mora na raiz, e não
// na moldura do app: o React não executa script inline em navegação
// client-side, e quem cai em /trilhas vindo do login por router.push perderia
// a preferência. String fixa, sem dado de usuário: nada a injetar aqui.
const RESTAURA_SIDEBAR = `try{if(localStorage.getItem(${JSON.stringify(
  CHAVE,
)})===${JSON.stringify(
  FECHADA,
)})document.documentElement.dataset.sidebar=${JSON.stringify(FECHADA)}}catch(e){}`;

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
      className={`${pressStart.variable} ${silkscreen.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="bg-void text-ink-soft min-h-full">
        <script dangerouslySetInnerHTML={{ __html: RESTAURA_SIDEBAR }} />
        {children}
      </body>
    </html>
  );
}
