import Link from "next/link";
import { TierBadge } from "./TierBadge";

// public/logos/<file>.svg -- six real Simple Icons marks (CC0, brand
// hex applied directly since Simple Icons ships them as a single
// monochrome path) plus AWS and Azure, which Simple Icons does not
// carry at all (both vendors' own trademark guidelines restrict fair
// use to plain text, logo use requires a license -- accepted here as
// a known, explicit trade-off, not an oversight). providerKey doesn't
// always match the file name (google -> googlecloud), hence the map
// rather than a bare `${providerKey}.svg` guess.
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

export function ProviderCard({
  providerKey,
  name,
  tier,
  version,
  resourceCount,
  dataSourceCount,
  description,
}: {
  providerKey: string;
  name: string;
  tier: string;
  version: string;
  resourceCount: number;
  dataSourceCount: number;
  description: string;
}) {
  return (
    <Link
      href={`/${providerKey}/${version}`}
      className="block rounded-2xl bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {LOGO_FILE[providerKey] && (
          <img src={`/logos/${LOGO_FILE[providerKey]}.svg`} alt="" className="h-6 w-auto shrink-0" />
        )}
        <h3 className="text-lg font-medium text-primary">{name}</h3>
        <TierBadge tier={tier} />
      </div>
      <p className="mt-2 text-sm text-foreground-muted">{description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-foreground-muted">
        <span>
          {resourceCount} resources &middot; {dataSourceCount} data sources
        </span>
        <span className="font-mono-tabular">v{version}</span>
      </div>
    </Link>
  );
}
