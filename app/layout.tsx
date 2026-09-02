import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ubx provider docs",
  description: "Provider reference documentation for ubx, versioned per SDK release.",
};

// Runs before paint, in <head>, ahead of any hydration -- sets
// data-theme from localStorage immediately so a reader who's already
// chosen "light" or "dark" never sees a flash of the OS-default theme
// first. Absent or invalid storage leaves no attribute at all, which
// is exactly "follow the OS", the same real default this site already
// had before the toggle existed (globals.css's own prefers-color-scheme
// block, unguarded by [data-theme], still applies in that case).
const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = window.localStorage.getItem("ubx-docs-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
