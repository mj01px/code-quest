import Image from "next/image";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="flex items-center border-b-2 border-edge bg-void px-6 py-2.5">
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
    </header>
  );
}
