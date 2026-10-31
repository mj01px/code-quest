import { AvisoDeConquista } from "@/components/conquistas/AvisoDeConquista";
import { AvisoConsentimento } from "@/components/legal/AvisoConsentimento";
import { LayoutDoApp } from "@/components/layout/LayoutDoApp";
import { AvisoDeNivel } from "@/components/progresso/AvisoDeNivel";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

// Layout compartilhado do app. O route group evita que a sidebar remonte entre rotas.
// O provedor fica aqui pra sobreviver a navegação e não re-buscar XP/conclusões a cada troca.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ProvedorProgresso>
      <AvisoDeNivel />
      <AvisoDeConquista />
      <AvisoConsentimento />
      <LayoutDoApp>{children}</LayoutDoApp>
    </ProvedorProgresso>
  );
}
