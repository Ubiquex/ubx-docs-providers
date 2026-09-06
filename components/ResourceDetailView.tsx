import {
  FieldSection,
  MAX_DEPTH_DATA_SOURCE,
  MAX_DEPTH_RESOURCE,
} from "./FieldTree";
import { LanguageTabs } from "./LanguageTabs";
import { VersionSelector } from "./VersionSelector";
import type { ResourceDetail } from "@/lib/docs";
import {
  getProvider,
  splitDataSourceFields,
  splitResourceFields,
} from "@/lib/docs";

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
  // Renders the content column only. It used to own <main>, the rail and
  // the sidebar, which meant the page's layout lived inside a detail
  // component and the user docs site wrote its own near-identical rail
  // separately. PageShell owns both now.
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-primary">
              {detail.dottedName}
            </h1>
            {detail.isDataSource && (
              <span className="rounded-full bg-foreground-muted/10 px-2 py-0.5 text-xs font-medium text-foreground-muted">
                data source
              </span>
            )}
          </div>
          <p className="mt-1 font-mono-tabular text-sm text-foreground-muted">
            {detail.wireType}
          </p>
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

      {detail.intro && (
        <p className="mt-4 leading-relaxed text-foreground">{detail.intro}</p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          Example
        </h2>
        <div className="mt-3">
          <LanguageTabs examples={examples} />
        </div>
      </section>

      {detail.isDataSource
        ? (() => {
            const { lookup, result } = splitDataSourceFields(detail.fields);
            return (
              <>
                <FieldSection
                  title="Lookup arguments"
                  headingId="arguments"
                  fields={lookup}
                  provider={provider}
                  version={version}
                  wireType={detail.wireType}
                  maxDepth={MAX_DEPTH_DATA_SOURCE}
                />
                <FieldSection
                  title="Result properties"
                  fields={result}
                  provider={provider}
                  version={version}
                  wireType={detail.wireType}
                  maxDepth={MAX_DEPTH_DATA_SOURCE}
                />
              </>
            );
          })()
        : (() => {
            const { input, output, hasRealOutputSplit } = splitResourceFields(
              detail.fields,
            );
            const outputCaveat = getProvider(provider)?.outputCaveat;
            return (
              <>
                <FieldSection
                  title={hasRealOutputSplit ? "Input properties" : "Properties"}
                  headingId="arguments"
                  fields={input}
                  provider={provider}
                  version={version}
                  wireType={detail.wireType}
                  maxDepth={MAX_DEPTH_RESOURCE}
                />
                {hasRealOutputSplit && (
                  <FieldSection
                    title="Output properties"
                    fields={output}
                    provider={provider}
                    version={version}
                    wireType={detail.wireType}
                    maxDepth={MAX_DEPTH_RESOURCE}
                  />
                )}
                {!hasRealOutputSplit && outputCaveat && (
                  <p className="mt-6 rounded-lg border border-foreground-muted/20 bg-foreground-muted/5 px-4 py-3 text-sm leading-relaxed text-foreground-muted">
                    {outputCaveat}
                  </p>
                )}
              </>
            );
          })()}
    </>
  );
}
