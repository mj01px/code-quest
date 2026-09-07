import type { ReactNode } from "react";
import { AppFooter } from "./AppFooter";

export function TelaBase({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-void text-ink-soft">
      {children}
      <AppFooter />
    </div>
  );
}
