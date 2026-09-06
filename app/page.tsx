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
    // Hero search on the landing page, header search everywhere else.
    // The previous change moved this site's hero box into the header so
    // that search existed on more than one page. That was right about the
    // content pages and wrong about this one: on a landing page whose
    // whole job is "what is here", search is a primary affordance rather
    // than a tool beside the theme toggle. The shell now renders both
    // placements, so this page gets the hero back without the content
    // pages losing anything.
    <PageShell
      nav={NAV}
      searchPlaceholder="Search resources and data sources..."
      searchPlacement="hero"
      footer={FOOTER}
      intro={
        <>
          <h1 className="text-center text-4xl font-medium text-foreground">
            Provider reference for <span className="text-primary">ubx</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center leading-relaxed text-foreground-muted">
            Resource and data source reference, one page per version, generated
            straight from each SDK&rsquo;s own real schema.
          </p>
        </>
      }
    >
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
