import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ResourceDetailView } from "@/components/ResourceDetailView";
import { getDataSource, getProvider, listCachedVersions, listResources } from "@/lib/docs";

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
  for (const version of listCachedVersions("kubernetes")) {
    for (const r of listResources("kubernetes", version)) {
      if (!r.isDataSource) continue;
      params.push({ provider: "kubernetes", version, service: r.service, resource: r.localName });
    }
  }
  return params;
}

function examplesFor(service: string, localName: string, dottedName: string) {
  const pascal = dottedName.split(".")[1];
  return {
    go: `import "github.com/ubiquex/ubx-sdk-kubernetes/sdk/go/kubernetes/data/${service}"

sdk.Data(${service}.${pascal}, "example", ${service}.${pascal}Lookup{
	// ...
})
`,
    typescript: `import { ${pascal} } from "@ubx/sdk-kubernetes/data/${service}";

data(${pascal}, "example", {
  // ...
});
`,
    python: `from ubx.kubernetes.data.${service}.${localName} import ${pascal}

data(${pascal}, "example", {
    # ...
})
`,
  };
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
        examples={examplesFor(service, resource, detail.dottedName)}
      />
    </>
  );
}
