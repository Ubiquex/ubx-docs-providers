import Link from "next/link";
import { LanguageTabs } from "./LanguageTabs";
import { RequiredBadge } from "./RequiredBadge";
import { VersionSelector } from "./VersionSelector";
import type { ResourceDetail, ResourceSummary } from "@/lib/docs";
import { fieldDescription, formatFieldType } from "@/lib/docs";

function siblingHref(provider: string, version: string, sibling: ResourceSummary): string {
  const base = sibling.isDataSource ? `/${provider}/${version}/data` : `/${provider}/${version}`;
  return `${base}/${sibling.service}/${sibling.localName}`;
}

export function ResourceDetailView({
  provider,
  version,
  versions,
  service,
  resource,
  detail,
  siblings,
  examples,
}: {
  provider: string;
  version: string;
  versions: string[];
  service: string;
  resource: string;
  detail: ResourceDetail;
  siblings: ResourceSummary[];
  examples: Record<"go" | "typescript" | "python", string>;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr_180px]">
        <nav className="hidden lg:block">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            {service}
          </h2>
          <ul className="mt-2 space-y-1">
            {siblings.map((r) => {
              const current = r.localName === resource && r.isDataSource === detail.isDataSource;
              return (
                <li key={`${r.isDataSource ? "data" : "resource"}-${r.wireType}`}>
                  <Link
                    href={siblingHref(provider, version, r)}
                    className={
                      current
                        ? "block rounded px-2 py-1 text-sm font-medium text-primary"
                        : "block rounded px-2 py-1 text-sm text-foreground-muted hover:text-primary"
                    }
                  >
                    {r.dottedName.split(".")[1]}
                    {r.isDataSource && <span className="text-foreground-muted"> (data)</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary">{detail.dottedName}</h1>
                {detail.isDataSource && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
                    data source
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono-tabular text-sm text-foreground-muted">{detail.wireType}</p>
            </div>
            <VersionSelector
              provider={provider}
              service={service}
              resource={resource}
              isDataSource={detail.isDataSource}
              versions={versions}
              current={version}
            />
          </div>

          {detail.intro && <p className="mt-4 text-foreground">{detail.intro}</p>}

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
              Example
            </h2>
            <div className="mt-3">
              <LanguageTabs examples={examples} />
            </div>
          </section>

          <section className="mt-8">
            <h2
              id="arguments"
              className="text-sm font-semibold uppercase tracking-wide text-foreground-muted"
            >
              {detail.isDataSource ? "Lookup arguments" : "Arguments"}
            </h2>
            <dl className="mt-3 divide-y divide-border">
              {detail.fields.map((f) => {
                const desc =
                  f.Description || fieldDescription(provider, version, detail.wireType, f.WireName);
                return (
                  <div key={f.WireName} id={`arg-${f.WireName}`} className="py-3">
                    <dt className="flex items-center gap-2">
                      <span className="font-mono-tabular text-sm font-medium text-primary">
                        {f.WireName}
                      </span>
                      <span className="text-xs text-foreground-muted">{formatFieldType(f.Type)}</span>
                      {f.Required && <RequiredBadge />}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {desc || <span className="text-foreground-muted">No description available.</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>

        <nav className="hidden lg:block">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            On this page
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <a href="#arguments" className="text-foreground-muted hover:text-primary">
                {detail.isDataSource ? "Lookup arguments" : "Arguments"}
              </a>
            </li>
            {detail.fields.map((f) => (
              <li key={f.WireName} className="pl-3">
                <a href={`#arg-${f.WireName}`} className="text-foreground-muted hover:text-primary">
                  {f.WireName}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
