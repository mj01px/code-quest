import Image from "next/image";
import Link from "next/link";
import { IconeEngrenagem } from "@/components/ui/icones";

const BOTAO =
  "flex h-8 w-8 items-center justify-center rounded-none border-2 " +
  "border-edge-soft bg-panel text-brand-light shadow-pixel " +
  "hover:border-brand hover:text-brand-mist";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b-2 border-edge bg-void px-6 py-2.5">
      <Link href="/" aria-label="CodeQuest, início">
        <Image
          src="/marca/logo.png"
          alt="CodeQuest"
          width={1705}
          height={189}
          priority
          className="block h-5 w-auto"
        />
      </Link>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Ajuda"
          className={`${BOTAO} font-display text-[10px] leading-none`}
        >
          ?
        </button>
        <button type="button" aria-label="Configurações" className={BOTAO}>
          <IconeEngrenagem />
        </button>
      </div>
    </header>
  );
}
