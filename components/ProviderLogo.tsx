import { readFileSync } from "node:fs";
import { join } from "node:path";

// public/logos/<file>.svg -- six real Simple Icons marks (CC0) plus
// AWS and Azure, which Simple Icons does not carry at all (both
// vendors' own trademark guidelines restrict fair use to plain text,
// logo use requires a license -- a known, explicit trade-off, not an
// oversight). providerKey doesn't always match the file name (google
// -> googlecloud), hence the map rather than a bare `${providerKey}.svg`
// guess.
const LOGO_FILE: Record<string, string> = {
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  google: "googlecloud",
  datadog: "datadog",
  github: "github",
  digitalocean: "digitalocean",
  cloudflare: "cloudflare",
};

// Rendered inline (not <img src>) specifically so it can inherit
// color -- an <img>-embedded SVG is an opaque replaced element, its
// own currentColor resolves against that SVG's own document, never
// the host page's CSS, so a monochrome, theme-following mark is not
// achievable through <img> at all. Every file under public/logos
// already carries `fill="currentColor"` on its own root <svg> (set by
// hand for the two vendor-sourced marks, whose real color came from a
// <style> block and gradients an attribute strip alone would have
// missed; set the same way for the six Simple Icons marks, which ship
// with no fill of their own) -- this component just inlines that
// already-monochrome markup, it does no color stripping of its own.
const cache = new Map<string, string>();

function readLogo(file: string): string {
  let svg = cache.get(file);
  if (svg === undefined) {
    svg = readFileSync(join(process.cwd(), "public", "logos", `${file}.svg`), "utf8");
    cache.set(file, svg);
  }
  return svg;
}

export function ProviderLogo({ providerKey, className }: { providerKey: string; className?: string }) {
  const file = LOGO_FILE[providerKey];
  if (!file) return null;
  return (
    <span
      aria-hidden="true"
      className={"inline-block shrink-0 text-foreground-muted [&>svg]:h-full [&>svg]:w-auto " + (className ?? "h-6")}
      dangerouslySetInnerHTML={{ __html: readLogo(file) }}
    />
  );
}
