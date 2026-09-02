import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ResourceDetailView } from "@/components/ResourceDetailView";
import { getProvider, getResource, listCachedVersions, listProviders, listResources } from "@/lib/docs";
import { exampleFor } from "@/lib/examples";

// UBI-240 slice 2: every real resource at every real cached version, not
// just the one namespace.core page slice 1 proved the mechanism with.
// Loops the real schema each cached version actually has -- a version
// missing a resource simply never gets a params entry for it, and any
// URL guessing at one falls through to Next's own real notFound()
// below, the same honest 404 the version selector relies on. Slice 3:
// loops every configured provider, not just kubernetes.
export function generateStaticParams() {
  const params: { provider: string; version: string; service: string; resource: string }[] = [];
  for (const provider of Object.keys(listProviders())) {
    for (const version of listCachedVersions(provider)) {
      for (const r of listResources(provider, version)) {
        if (r.isDataSource) continue;
        params.push({ provider, version, service: r.service, resource: r.localName });
      }
    }
  }
  return params;
}

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

  const siblings = listResources(provider, version).filter((r) => r.service === service);

  return (
    <>
      <Header />
      <ResourceDetailView
        provider={provider}
        version={version}
        versions={cfg.versions}
        service={service}
        resource={resource}
        detail={detail}
        siblings={siblings}
        examples={exampleFor(provider, version, detail.wireType)}
      />
    </>
  );
}
