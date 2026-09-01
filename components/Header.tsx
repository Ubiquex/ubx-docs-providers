import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link href="/" className="text-lg font-bold text-primary">
          ubx providers
        </Link>
      </div>
    </header>
  );
}
