import { Header } from "@ubx/docs-ui";
import { NAV } from "@/lib/nav";
import { GlobalSearch } from "@ubx/docs-ui";
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
    <>
      <Header nav={NAV} />
      <main className="mx-auto w-full max-w-7xl px-6 py-12">
        <h1 className="text-center text-4xl font-medium text-foreground">
          Provider reference for <span className="text-primary">ubx</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center leading-relaxed text-foreground-muted">
          Resource and data source reference, one page per version, generated straight
          from each SDK&rsquo;s own real schema.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <GlobalSearch
            placeholder="Search resources and data sources..."
            inputClassName="w-full rounded-full bg-field px-5 py-3 text-base text-foreground outline-none placeholder:text-foreground-muted focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ProviderCard key={c.providerKey} {...c} />
          ))}
        </div>

        <div className="mt-12">
          <TierLegend />
        </div>
      </main>
    </>
  );
}
