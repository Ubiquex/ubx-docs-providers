import { notFound } from "next/navigation";
import { Header } from "@ubx/docs-ui";
import { NAV } from "@/lib/nav";
import { MobileSidebarToggle } from "@ubx/docs-ui";
import { ProviderSidebar } from "@/components/ProviderSidebar";
import { ResourceDetailView } from "@/components/ResourceDetailView";
import { getDataSource, getProvider, listCachedVersions, listProviders, listResources } from "@/lib/docs";
import { exampleFor } from "@/lib/examples";

// Data sources live under their own /data/ segment, matching the real
// generated package layout every SDK language already uses
// (sdk/go/kubernetes/data/<service>/..., ubx.kubernetes.data.<service>
// in Python) -- not an invented URL convention. Needed because a
// resource and a same-named data source share the identical wire
// binding NAME (both are just "Namespace", confirmed directly against
// the real generated Go: kubernetes/core/namespace.go and
// kubernetes/data/core/namespace.go both declare `var Namespace`),
// only the import path tells them apart -- the URL has to carry that
// same distinction or the two would collide.
export function generateStaticParams() {
  const params: { provider: string; version: string; service: string; resource: string }[] = [];
  for (const provider of Object.keys(listProviders())) {
    for (const version of listCachedVersions(provider)) {
      for (const r of listResources(provider, version)) {
        if (!r.isDataSource) continue;
        params.push({ provider, version, service: r.service, resource: r.localName });
      }
    }
  }
  return params;
}

export default async function DataSourcePage({
  params,
}: {
  params: Promise<{ provider: string; version: string; service: string; resource: string }>;
}) {
  const { provider, version, service, resource } = await params;
  const cfg = getProvider(provider);
  if (!cfg) notFound();

  const detail = getDataSource(provider, version, service, resource);
  if (!detail) notFound();

  return (
    <>
      <Header
        nav={NAV}
        mobileMenu={
          <MobileSidebarToggle>
            <ProviderSidebar providerKey={provider} version={version} current={{ service, localName: resource, isDataSource: true }} className="block" />
          </MobileSidebarToggle>
        }
      />
      <ResourceDetailView
        provider={provider}
        version={version}
        versions={cfg.versions}
        service={service}
        resource={resource}
        detail={detail}
        examples={exampleFor(provider, version, detail.wireType)}
      />
    </>
  );
}
