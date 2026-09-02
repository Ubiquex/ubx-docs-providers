import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

// Real wordmark, not text -- public/logo/{logo,logo-dark}.png, copied
// verbatim from ubiquex-docs (the real, git-tracked source this site's
// own branding comes from). Both variants render always; globals.css's
// own .logo-light/.logo-dark rules (the same [data-theme] contract
// every other color token uses) pick the right one, so the swap works
// with zero client JS and stays correct through the toggle below.
export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <img src="/logo/logo.png" alt="ubx" className="logo-light h-6 w-auto" />
          <img src="/logo/logo-dark.png" alt="ubx" className="logo-dark h-6 w-auto" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
