import type { Metadata } from "next";

import { PainelDoCla } from "@/components/clas/PainelDoCla";

export const metadata: Metadata = {
  title: "Clã",
  description: "Detalhes do clã, membros e gestão.",
};

export default async function ClaPage({ params }: PageProps<"/clas/[tag]">) {
  const { tag } = await params;
  return <PainelDoCla tag={tag} />;
}
