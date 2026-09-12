import { LayoutDoApp } from "@/components/layout/LayoutDoApp";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

// Layout compartilhado do app. O route group evita que a sidebar remonte entre rotas.
// O provedor fica aqui pra sobreviver a navegação e não re-buscar XP/conclusões a cada troca.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ProvedorProgresso>
      <LayoutDoApp>{children}</LayoutDoApp>
    </ProvedorProgresso>
  );
}
