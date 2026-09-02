import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TierBadge } from "@/components/TierBadge";
import { LanguageTabs } from "@/components/LanguageTabs";
import { ServiceGroupBrowser } from "@/components/ServiceGroupBrowser";
import {
  getManifest,
  getProvider,
  listCachedVersions,
  listProviders,
  listServiceGroups,
  pickStarterResource,
  versionExists,
} from "@/lib/docs";
import { exampleFor } from "@/lib/examples";

export function generateStaticParams() {
  return Object.keys(listProviders()).flatMap((provider) =>
    listCachedVersions(provider).map((version) => ({ provider, version })),
  );
}

export default async function ProviderHomePage({
  params,
}: {
  params: Promise<{ provider: string; version: string }>;
}) {
  const { provider, version } = await params;
  const cfg = getProvider(provider);
  if (!cfg || !versionExists(provider, version)) notFound();

  const manifest = getManifest(provider, version);
  const groups = listServiceGroups(provider, version);
  const starter = pickStarterResource(provider, version);
  const starterExamples = starter ? exampleFor(provider, version, starter.wireType) : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-primary">{cfg.name}</h1>
          <TierBadge tier={cfg.tier} />
        </div>
        <p className="mt-2 text-foreground-muted">{cfg.description}</p>
        <div className="mt-3 flex gap-4 text-sm text-foreground-muted">
          <span>{manifest.resource_count} resources</span>
          <span>{manifest.data_source_count} data sources</span>
          <span className="font-mono-tabular">v{version}</span>
        </div>

        {starter && starterExamples && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
              Get started
            </h2>
            <div className="mt-3">
              <LanguageTabs examples={starterExamples} />
            </div>
            <p className="mt-3 text-sm text-foreground-muted">
              See a full page for this example&rsquo;s own resource:{" "}
              <Link
                href={`/${provider}/${version}/${starter.service}/${starter.localName}`}
                className="text-primary underline"
              >
                {starter.dottedName}
              </Link>
            </p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
            Service groups
          </h2>
          <div className="mt-3">
            <ServiceGroupBrowser groups={groups} />
          </div>
        </section>
      </main>
    </>
  );
}
