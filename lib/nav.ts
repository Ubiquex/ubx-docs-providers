import type { NavLink } from "@ubx/docs-ui";

// Moved out of Header.tsx when the header was extracted to @ubx/docs-ui
// (UBI-247). The list itself is unchanged, including its original
// reasoning: every destination was checked directly rather than guessed.
// Home and Blog point at ubiquex-web's real GitHub Pages URL;
// Documentation, Tutorials and Install at docs.ubiquex.io's real pages;
// Providers is this site's own landing page.
export const NAV: NavLink[] = [
  { label: "Home", href: "https://ubiquex.io" },
  { label: "Install", href: "https://docs.ubiquex.io/install" },
  { label: "Documentation", href: "https://docs.ubiquex.io" },
  { label: "Tutorials", href: "https://docs.ubiquex.io/tutorial" },
  { label: "Providers", href: "/" },
  { label: "Blog", href: "https://ubiquex.io/blog/" },
];

// Footer identity. Required props since @ubx/docs-ui 0.3.0: the shared
// Footer used to hardcode exactly this site's tagline, which is how it
// ended up asserting that the user docs site's hand-written pages were
// generated from provider schemas.
export const FOOTER = {
  tagline: "Reference content is generated from each provider\u2019s own real schema, not hand-written.",
  links: [
    { label: "Documentation", href: "https://docs.ubiquex.io" },
    { label: "GitHub", href: "https://github.com/Ubiquex" },
    { label: "License", href: "https://github.com/Ubiquex/ubx-docs-providers/blob/main/LICENSE" },
  ],
};

