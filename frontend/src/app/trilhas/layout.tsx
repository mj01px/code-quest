import { BarraDeMenu } from "@/components/layout/BarraDeMenu";
import { Sidebar } from "@/components/layout/Sidebar";
import { CHAVE, FECHADA } from "@/lib/preferenciaSidebar";

// Roda antes da primeira pintura, senão a sidebar recolhida piscaria aberta a
// cada carregamento. String fixa, sem dado de usuário: nada a injetar aqui.
const RESTAURA_PREFERENCIA = `try{if(localStorage.getItem(${JSON.stringify(
  CHAVE,
)})===${JSON.stringify(
  FECHADA,
)})document.documentElement.dataset.sidebar=${JSON.stringify(FECHADA)}}catch(e){}`;

export default function TrilhasLayout({ children }: LayoutProps<"/trilhas">) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RESTAURA_PREFERENCIA }} />
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <BarraDeMenu />
          <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-10">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
