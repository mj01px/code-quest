import type { Metadata } from "next";
import { connection } from "next/server";

import { AvisoDeLimite } from "@/components/ui/AvisoDeLimite";
import { variaveisDasFontes } from "@/lib/tipografia";

import "./globals.css";

export const metadata: Metadata = {
  title: "CodeQuest",
  description:
    "Plataforma gamificada de ensino de programação. Seu progresso vira a evolução de uma criatura.",
  icons: { icon: "/marca/ovo.png" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render por request: o nonce da CSP (src/proxy.ts) só entra em HTML gerado
  // na hora; página estática sairia sem nonce e teria os scripts barrados.
  await connection();
  return (
    <html
      lang="pt-BR"
      className={`${variaveisDasFontes} h-full antialiased`}
    >
      <body className="bg-void text-ink-soft min-h-full">
        {children}
        <AvisoDeLimite />
      </body>
    </html>
  );
}
