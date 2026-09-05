import { notFound, redirect } from "next/navigation";
import { getProvider, latestVersion, listProviders } from "@/lib/docs";

export function generateStaticParams() {
  return Object.keys(listProviders()).map((provider) => ({ provider }));
}

// A bare /kubernetes redirects to its latest configured version -- each
// version is its own real page, UBI-240's own explicit URL contract.
export default async function ProviderRedirectPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const cfg = getProvider(provider);
  if (!cfg) notFound();
  const version = latestVersion(provider);
  if (!version) notFound();
  redirect(`/${provider}/${version}`);
}
