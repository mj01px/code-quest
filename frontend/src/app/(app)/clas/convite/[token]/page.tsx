import type { Metadata } from "next";

import { PainelAceitarConvite } from "@/components/clas/PainelAceitarConvite";

export const metadata: Metadata = {
  title: "Convite de clã",
  description: "Você foi convidado para um clã no CodeQuest.",
};

export default async function AceitarConvitePage({
  params,
}: PageProps<"/clas/convite/[token]">) {
  const { token } = await params;
  return <PainelAceitarConvite token={token} />;
}
