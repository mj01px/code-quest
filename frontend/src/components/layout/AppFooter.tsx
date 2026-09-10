import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "/termos", rotulo: "TERMOS" },
  { href: "/privacidade", rotulo: "PRIVACIDADE" },
  { href: "/suporte", rotulo: "TERMINAL_DOCS" },
];

export function AppFooter() {
  return (
    <footer className="border-t-2 border-edge">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <Image
            src="/marca/ovo.png"
            alt=""
            width={1254}
            height={1254}
            className="block h-8 w-8"
          />
          <Image
            src="/marca/logo.png"
            alt="CodeQuest"
            width={1705}
            height={189}
            className="block h-3.5 w-auto opacity-85"
          />
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-3 font-label text-[11px] tracking-[0.15em]">
          {LINKS.map((link) => (
            <Link key={link.rotulo} href={link.href} className="text-[#c4bcd8]">
              {link.rotulo}
            </Link>
          ))}
        </nav>

        <p className="w-fit border-b-2 border-brand-deep font-label text-[11px] tracking-[0.2em] text-[#b99bf0]">
          © 2026 CODEQUEST OS
        </p>
      </div>
    </footer>
  );
}
