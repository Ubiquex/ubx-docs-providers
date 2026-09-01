import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getProvider, listCachedVersions, listResources, listServiceGroups, versionExists } from "@/lib/docs";

// UBI-240 slice 2: the per-service listing page slice 1 deliberately
// left unbuilt (ServiceGroupCard's own doc comment named it directly --
// linking to this before it existed would have 404'd for every group).
// Real now: every service group at every cached version gets a real
// page here, listing its own real resources and data sources.
export function generateStaticParams() {
  const params: { provider: string; version: string; service: string }[] = [];
  for (const version of listCachedVersions("kubernetes")) {
    for (const g of listServiceGroups("kubernetes", version)) {
      params.push({ provider: "kubernetes", version, service: g.service });
    }
  }
  return params;
}

export default async function ServiceGroupPage({
  params,
}: {
  params: Promise<{ provider: string; version: string; service: string }>;
}) {
  const { provider, version, service } = await params;
  const cfg = getProvider(provider);
  if (!cfg || !versionExists(provider, version)) notFound();

  const all = listResources(provider, version).filter((r) => r.service === service);
  if (all.length === 0) notFound();

  const resources = all.filter((r) => !r.isDataSource);
  const dataSources = all.filter((r) => r.isDataSource);
  const label = all[0].category;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold text-primary">{label}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {resources.length} resource{resources.length === 1 ? "" : "s"}
          {dataSources.length > 0
            ? ` · ${dataSources.length} data source${dataSources.length === 1 ? "" : "s"}`
            : ""}
        </p>

        {resources.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
              Resources
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {resources.map((r) => (
                <li key={r.wireType}>
                  <Link
                    href={`/${provider}/${version}/${service}/${r.localName}`}
                    className="block rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary hover:border-primary"
                  >
                    {r.dottedName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {dataSources.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
              Data sources
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dataSources.map((r) => (
                <li key={r.wireType}>
                  <Link
                    href={`/${provider}/${version}/data/${service}/${r.localName}`}
                    className="block rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary hover:border-primary"
                  >
                    {r.dottedName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
