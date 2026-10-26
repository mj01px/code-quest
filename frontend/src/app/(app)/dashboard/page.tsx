import type { Metadata } from "next";

import { PainelDashboard } from "@/components/dashboard/PainelDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Seu XP, exercícios, sequência e atividade da semana.",
};

export default function DashboardPage() {
  return <PainelDashboard />;
}
