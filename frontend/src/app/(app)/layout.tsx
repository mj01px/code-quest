import { LayoutDoApp } from "@/components/layout/LayoutDoApp";

// Route group: `(app)` não entra na URL, só agrupa quem divide a moldura.
// Antes `/trilhas` e `/desafios` tinham cada um o seu layout, e por serem
// segmentos irmãos a moldura inteira desmontava ao navegar de um para o outro
// — a sidebar remontava e o bloco de identidade piscava a cada troca de página.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <LayoutDoApp>{children}</LayoutDoApp>;
}
