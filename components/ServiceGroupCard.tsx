import Link from "next/link";

// UBI-240 slice 2: a real link now that app/[provider]/[version]/
// [service]/page.tsx exists -- slice 1's own version of this component
// deliberately left it inert (its own doc comment explained why: no
// destination page existed yet, and linking to one that doesn't 404s).
export function ServiceGroupCard({
  providerKey,
  version,
  service,
  label,
  resourceCount,
  dataSourceCount,
}: {
  providerKey: string;
  version: string;
  service: string;
  label: string;
  resourceCount: number;
  dataSourceCount: number;
}) {
  return (
    <Link
      href={`/${providerKey}/${version}/${service}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary"
    >
      <h3 className="font-medium text-primary">{label}</h3>
      <p className="mt-1 text-xs text-foreground-muted">
        {resourceCount} resource{resourceCount === 1 ? "" : "s"}
        {dataSourceCount > 0 ? ` · ${dataSourceCount} data source${dataSourceCount === 1 ? "" : "s"}` : ""}
      </p>
    </Link>
  );
}
