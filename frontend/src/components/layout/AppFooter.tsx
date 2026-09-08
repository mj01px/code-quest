import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "/termos", rotulo: "TERMOS_DE_USO" },
  { href: "/privacidade", rotulo: "POLITICA_DE_PRIVACIDADE" },
  { href: "/suporte", rotulo: "SUPORTE" },
];

export function AppFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-5 border-t-2 border-edge px-6 py-4">
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

      <nav className="flex flex-wrap gap-5 font-label text-xs tracking-[2px]">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-[#c4bcd8]">
            {link.rotulo}
          </Link>
        ))}
      </nav>

      <p className="border-b-2 border-brand-deep font-label text-[11px] tracking-[2px] text-[#b99bf0]">
        © 2026 CODEQUEST
      </p>
    </footer>
  );
}
