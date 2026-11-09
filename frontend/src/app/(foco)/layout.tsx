import { AvisoDeConquista } from "@/components/conquistas/AvisoDeConquista";
import { AvisoConsentimento } from "@/components/legal/AvisoConsentimento";
import { AvisoDeNivel } from "@/components/progresso/AvisoDeNivel";
import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

// Exercício, quiz e leitura moram aqui: subir de nível ou ganhar conquista
// acontece nesta tela, então os avisos precisam estar montados nela também.
export default function LayoutDeFoco({ children }: LayoutProps<"/">) {
  return (
    <ProvedorProgresso>
      <AvisoDeNivel />
      <AvisoDeConquista />
      <AvisoConsentimento />
      <div className="min-h-dvh bg-void">{children}</div>
    </ProvedorProgresso>
  );
}
