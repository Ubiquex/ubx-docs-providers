// ServiceGroupCard is deliberately NOT a link this slice. UBI-240's own
// scope for slice 1 is three page types -- landing, provider home, one
// resource page -- a per-service listing page is real, honest, later
// work, not this slice's job to fake with links that would 404 for
// every group except the one resource actually rendered. The grid
// itself (real service names, real counts) is what this slice needs to
// prove; making every card clickable is next.
export function ServiceGroupCard({
  label,
  resourceCount,
  dataSourceCount,
}: {
  label: string;
  resourceCount: number;
  dataSourceCount: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-medium text-primary">{label}</h3>
      <p className="mt-1 text-xs text-foreground-muted">
        {resourceCount} resource{resourceCount === 1 ? "" : "s"}
        {dataSourceCount > 0 ? ` · ${dataSourceCount} data source${dataSourceCount === 1 ? "" : "s"}` : ""}
      </p>
    </div>
  );
}
