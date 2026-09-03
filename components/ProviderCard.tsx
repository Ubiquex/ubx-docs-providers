import Link from "next/link";
import { TierBadge } from "./TierBadge";

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
