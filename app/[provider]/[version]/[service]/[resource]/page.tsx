import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { LanguageTabs } from "@/components/LanguageTabs";
import { RequiredBadge } from "@/components/RequiredBadge";
import { VersionSelector } from "@/components/VersionSelector";
import {
  fieldDescription,
  formatFieldType,
  getProvider,
  getResource,
  listCachedVersions,
  listResources,
} from "@/lib/docs";

// UBI-240 slice 1 only ever built one real resource page --
// kubernetes_core_namespace, chosen for being small and easy to read
// end to end. generateStaticParams stays literal to that one pair
// rather than looping every resource this version's schema dump
// actually has: building all 92 pages is real, next-slice work (the
// per-resource rendering itself is what this slice proves, not full
// corpus coverage). Any other resource under this route falls through
// to Next's own real notFound() -- the same "genuinely doesn't exist
// yet, an honest 404" the version selector below also relies on.
export function generateStaticParams() {
  return listCachedVersions("kubernetes").map((version) => ({
    provider: "kubernetes",
    version,
    service: "core",
    resource: "namespace",
  }));
}

const EXAMPLES = {
  go: `containerRepo := sdk.Resource(core.Namespace, "platform", core.NamespaceConfig{
	Metadata: map[string]any{"name": "platform"},
})
`,
  typescript: `const ns = resource(Namespace, "platform", {
  metadata: { name: "platform" },
});
`,
  python: `ns = resource(Namespace, "platform", {
    "metadata": {"name": "platform"},
})
`,
};

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ provider: string; version: string; service: string; resource: string }>;
}) {
  const { provider, version, service, resource } = await params;
  const cfg = getProvider(provider);
  if (!cfg) notFound();

  const detail = getResource(provider, version, service, resource);
  if (!detail) notFound();

  const siblings = listResources(provider, version).filter(
    (r) => r.service === service && !r.isDataSource,
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr_180px]">
          <nav className="hidden lg:block">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              {service}
            </h2>
            <ul className="mt-2 space-y-1">
              {siblings.map((r) => (
                <li key={r.wireType}>
                  <span
                    className={
                      r.localName === resource
                        ? "block rounded px-2 py-1 text-sm font-medium text-primary"
                        : "block rounded px-2 py-1 text-sm text-foreground-muted"
                    }
                  >
                    {r.dottedName.split(".")[1]}
                  </span>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  <span className="text-primary">{detail.dottedName}</span>
                </h1>
                <p className="mt-1 font-mono-tabular text-sm text-foreground-muted">{detail.wireType}</p>
              </div>
              <VersionSelector
                provider={provider}
                service={service}
                resource={resource}
                versions={cfg.versions}
                current={version}
              />
            </div>

            {detail.intro && <p className="mt-4 text-foreground">{detail.intro}</p>}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                Example
              </h2>
              <div className="mt-3">
                <LanguageTabs examples={EXAMPLES} />
              </div>
            </section>

            <section className="mt-8">
              <h2 id="arguments" className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                Arguments
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
                  Arguments
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
    </>
  );
}
