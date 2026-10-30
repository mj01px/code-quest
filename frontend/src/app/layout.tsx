import type { Metadata } from "next";

import { variaveisDasFontes } from "@/lib/tipografia";

import "./globals.css";

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
      className={`${variaveisDasFontes} h-full antialiased`}
    >
      <body className="bg-void text-ink-soft min-h-full">{children}</body>
    </html>
  );
}
