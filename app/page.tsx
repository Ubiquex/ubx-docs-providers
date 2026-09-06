import { PageShell } from "@ubx/docs-ui";
import { NAV, FOOTER } from "@/lib/nav";
import { ProviderCard } from "@/components/ProviderCard";
import { TierLegend } from "@/components/TierLegend";
import { getManifest, latestVersion, listProviders } from "@/lib/docs";

export default function HomePage() {
  const providers = listProviders();
  const cards = Object.entries(providers).map(([providerKey, cfg]) => {
    const version = latestVersion(providerKey)!;
    const manifest = getManifest(providerKey, version);
    return {
      providerKey,
      name: cfg.name,
      tier: cfg.tier,
      version,
      resourceCount: manifest.resource_count,
      dataSourceCount: manifest.data_source_count,
      description: cfg.description,
    };
  });

  return (
    <PageShell
      nav={NAV}
      searchPlaceholder="Search resources and data sources..."
      footer={FOOTER}
    >
      <h1 className="text-center text-4xl font-medium text-foreground">
        Provider reference for <span className="text-primary">ubx</span>
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center leading-relaxed text-foreground-muted">
        Resource and data source reference, one page per version, generated
        straight from each SDK&rsquo;s own real schema.
      </p>

      {/* The hero search box was here. It moved into the header via
            PageShell, which puts search on every page of both sites
            instead of on one page each: this site's home, and the user
            docs site's section landings, which no longer exist. Leaving
            it here as well would mean two search boxes on this page. */}

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <ProviderCard key={c.providerKey} {...c} />
        ))}
      </div>

      <div className="mt-12">
        <TierLegend />
      </div>
    </PageShell>
  );
}
