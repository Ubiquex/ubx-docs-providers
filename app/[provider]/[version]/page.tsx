import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TierBadge } from "@/components/TierBadge";
import { LanguageTabs } from "@/components/LanguageTabs";
import { ServiceGroupCard } from "@/components/ServiceGroupCard";
import { getManifest, getProvider, listCachedVersions, listServiceGroups, versionExists } from "@/lib/docs";

export function generateStaticParams() {
  return listCachedVersions("kubernetes").map((version) => ({ provider: "kubernetes", version }));
}

const STARTER_EXAMPLES = {
  go: `package main

import (
	sdk "github.com/ubiquex/ubx-sdk-go/runtime"
	"github.com/ubiquex/ubx-sdk-kubernetes/sdk/go/kubernetes/core"
)

func main() {
	sdk.Main(sdk.Stack("platform", func() {
		sdk.Intent(sdk.IntentInfo{Summary: "a namespace for the platform team"})
		sdk.Resource(core.Namespace, "platform", core.NamespaceConfig{
			Metadata: map[string]any{"name": "platform"},
		})
	}))
}
`,
  typescript: `import { stack, resource, intent } from "@ubx/sdk";
import { Namespace } from "@ubx/sdk-kubernetes/core";

stack("platform", () => {
  intent("a namespace for the platform team");
  resource(Namespace, "platform", {
    metadata: { name: "platform" },
  });
});
`,
  python: `from ubx_sdk import stack, resource, intent
from ubx.kubernetes.core.namespace import Namespace

stack("platform", lambda: [
    intent("a namespace for the platform team"),
    resource(Namespace, "platform", {
        "metadata": {"name": "platform"},
    }),
])
`,
};

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

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
            Get started
          </h2>
          <div className="mt-3">
            <LanguageTabs examples={STARTER_EXAMPLES} />
          </div>
          <p className="mt-3 text-sm text-foreground-muted">
            See a full page for this example&rsquo;s own resource:{" "}
            <Link href={`/${provider}/${version}/core/namespace`} className="text-primary underline">
              core.Namespace
            </Link>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
            Service groups
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {groups.map((g) => (
              <ServiceGroupCard
                key={g.service}
                label={g.label}
                resourceCount={g.resourceCount}
                dataSourceCount={g.dataSourceCount}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
