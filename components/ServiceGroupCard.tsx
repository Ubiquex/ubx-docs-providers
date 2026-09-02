import Link from "next/link";

// UBI-240: links straight to the service's own first real resource or
// data source page (lib/docs.ts's own listServiceGroups computes
// firstHref) -- the intermediate per-service listing page this used to
// link to is gone, its only real job (picking one of these links for
// the reader) done here at build time instead of behind an extra click.
export function ServiceGroupCard({
  label,
  resourceCount,
  dataSourceCount,
  firstHref,
}: {
  label: string;
  resourceCount: number;
  dataSourceCount: number;
  firstHref: string;
}) {
  return (
    <Link
      href={firstHref}
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
