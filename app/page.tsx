import { Header } from "@/components/Header";
import { ProviderSearch } from "@/components/ProviderSearch";
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
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-center text-3xl font-bold text-foreground">
          Provider reference for <span className="text-primary">ubx</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-foreground-muted">
          Resource and data source reference, one page per version, generated straight from
          each SDK&rsquo;s own real schema.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <ProviderSearch providers={cards} />
        </div>

        <div className="mx-auto mt-12 max-w-xl">
          <TierLegend />
        </div>
      </main>
    </>
  );
}
