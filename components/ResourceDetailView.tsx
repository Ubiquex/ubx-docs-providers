import { LanguageTabs } from "./LanguageTabs";
import { ProviderSidebar } from "./ProviderSidebar";
import { RequiredBadge } from "./RequiredBadge";
import { VersionSelector } from "./VersionSelector";
import type { ResourceDetail } from "@/lib/docs";
import { fieldDescription, formatFieldType } from "@/lib/docs";

export function ResourceDetailView({
  provider,
  version,
  versions,
  service,
  resource,
  detail,
  examples,
}: {
  provider: string;
  version: string;
  versions: string[];
  service: string;
  resource: string;
  detail: ResourceDetail;
  examples: Record<"go" | "typescript" | "python", string>;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <ProviderSidebar
          providerKey={provider}
          version={version}
          current={{ service, localName: resource, isDataSource: detail.isDataSource }}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-medium text-primary">{detail.dottedName}</h1>
                {detail.isDataSource && (
                  <span className="rounded-full bg-foreground-muted/10 px-2 py-0.5 text-xs font-medium text-foreground-muted">
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

          {detail.intro && <p className="mt-4 leading-relaxed text-foreground">{detail.intro}</p>}

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
                      <span className="text-xs text-accent-yellow">{formatFieldType(f.Type)}</span>
                      {f.Required && <RequiredBadge />}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-foreground">
                      {desc || <span className="text-foreground-muted">No description available.</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
