import type { ReactNode } from "react";
import { AppFooter } from "./AppFooter";

interface Props {
  children: ReactNode;
  rodape?: boolean;
}

export function TelaBase({ children, rodape = true }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col bg-void text-ink-soft">
      {children}
      {rodape ? <AppFooter /> : null}
    </div>
  );
}
