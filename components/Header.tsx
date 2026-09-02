import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

// Real wordmark, not text -- public/logo/{logo,logo-dark}.png, copied
// verbatim from ubiquex-docs (the real, git-tracked source this site's
// own branding comes from). Both variants render always; globals.css's
// own .logo-light/.logo-dark rules (the same [data-theme] contract
// every other color token uses) pick the right one, so the swap works
// with zero client JS and stays correct through the toggle below.

// Every real destination checked directly rather than guessed --
// "most of those don't exist yet" turned out wrong for all six. Home
// and Blog point at ubiquex-web's own real GitHub Pages URL (that
// repo's own README: "Next-generation Ubiquex website and blog",
// confirmed live via `gh api .../pages` -- no custom ubiquex.io domain
// wired to it yet, unlike the separate, unrelated `ubiquex.io` repo,
// confirmed to be an untouched Astro starter template, not real
// content). Documentation/Tutorials/Install point at docs.ubiquex.io's
// own real, live Mintlify pages (confirmed against that site's own
// docs.json navigation -- "tutorial/index" and "install/index" are
// real, existing pages, not placeholders). Providers is this site's
// own landing page. Blog's own real content is one placeholder post
// (ubiquex-web's content/blog/hello-world.mdx) -- real and live, just
// not yet a populated blog.
const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "https://ubiquex.github.io/ubiquex-web/" },
  { label: "Install", href: "https://docs.ubiquex.io/install" },
  { label: "Documentation", href: "https://docs.ubiquex.io" },
  { label: "Tutorials", href: "https://docs.ubiquex.io/tutorial" },
  { label: "Providers", href: "/" },
  { label: "Blog", href: "https://ubiquex.github.io/ubiquex-web/blog" },
];

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex shrink-0 items-center">
          <img src="/logo/logo.png" alt="ubx" className="logo-light h-6 w-auto" />
          <img src="/logo/logo-dark.png" alt="ubx" className="logo-dark h-6 w-auto" />
        </Link>

        <nav className="hidden flex-1 items-center gap-5 md:flex">
          {NAV_LINKS.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm text-foreground-muted hover:text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-foreground-muted hover:text-primary"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
