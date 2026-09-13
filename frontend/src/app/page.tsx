import type { Metadata } from "next";
import { ChamadaFinal } from "@/components/landing/ChamadaFinal";
import { Cli } from "@/components/landing/Cli";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { Conquistas } from "@/components/landing/Conquistas";
import { AppFooter } from "@/components/layout/AppFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Pets } from "@/components/landing/Pets";

export const metadata: Metadata = {
  title: "CodeQuest",
  description:
    "Envie seus materiais, receba exercícios feitos sob medida e evolua seu pet a cada desafio vencido. Tudo dentro de um terminal de verdade.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-void text-ink-soft [background-image:linear-gradient(rgba(168,85,247,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.035)_1px,transparent_1px)] [background-size:32px_32px]">
      <LandingNavbar />
      <main>
        <LandingHero />
        <ComoFunciona />
        <Cli />
        <Pets />
        <Conquistas />
        <ChamadaFinal />
      </main>
      <AppFooter />
    </div>
  );
}
