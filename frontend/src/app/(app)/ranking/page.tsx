import type { Metadata } from "next";

import { PainelDeRanking } from "@/components/ranking/PainelDeRanking";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Quem mais evoluiu neste mês e os campeões dos anteriores.",
};

export default function RankingPage() {
  return <PainelDeRanking />;
}
