// Footer: Material style, a hairline divider and quiet text, not a
// heavy block -- the same restrained treatment already established
// for hairline dividers site-wide (globals.css's own --color-border).
// Links repeat two of Header's own real, checked destinations
// (Documentation, GitHub) rather than inventing new ones, plus a
// License link to this repo's own real LICENSE file (Apache 2.0,
// confirmed directly from the file, not assumed).
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-foreground-muted">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p>Reference content is generated from each provider&rsquo;s own real schema, not hand-written.</p>
          <nav className="flex items-center gap-5">
            <a href="https://docs.ubiquex.io" className="hover:text-primary">
              Documentation
            </a>
            <a href="https://github.com/Ubiquex" className="hover:text-primary">
              GitHub
            </a>
            <a
              href="https://github.com/Ubiquex/ubx-docs-providers/blob/main/LICENSE"
              className="hover:text-primary"
            >
              License
            </a>
          </nav>
        </div>
        <p className="mt-4 text-center text-xs sm:text-left">&copy; 2026 Ubiquex</p>
      </div>
    </footer>
  );
}
