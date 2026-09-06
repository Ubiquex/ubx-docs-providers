import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@ubx/docs-ui";
import "./globals.css";

// Poppins for text, JetBrains Mono for code, self-hosted by next/font
// rather than linked from fonts.googleapis.com: identical rendering, no
// third-party request on every page load.
//
// This site used to fall back to the OS UI font (-apple-system,
// BlinkMacSystemFont, Segoe UI), so the same product rendered in a
// different typeface on every platform, and in a different one again
// from the marketing site. The weights are only those actually used;
// requesting more would ship bytes nothing reads.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ubx provider docs",
  description: "Provider reference documentation for ubx, versioned per SDK release.",
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${poppins.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
