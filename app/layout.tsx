import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@ubx/docs-ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "ubx provider docs",
  description: "Provider reference documentation for ubx, versioned per SDK release.",
};


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
