import { ProvedorProgresso } from "@/components/progresso/ProvedorProgresso";

export default function LayoutDeFoco({ children }: LayoutProps<"/">) {
  return (
    <ProvedorProgresso>
      <div className="min-h-dvh bg-void">{children}</div>
    </ProvedorProgresso>
  );
}
