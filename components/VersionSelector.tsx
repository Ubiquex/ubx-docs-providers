"use client";

import { useRouter } from "next/navigation";

export function VersionSelector({
  provider,
  service,
  resource,
  versions,
  current,
}: {
  provider: string;
  service: string;
  resource: string;
  versions: string[];
  current: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/${provider}/${e.target.value}/${service}/${resource}`)}
      className="rounded-md border border-border bg-surface px-2 py-1 text-sm font-mono-tabular text-foreground outline-none focus:border-primary"
    >
      {versions.map((v) => (
        <option key={v} value={v}>
          v{v}
        </option>
      ))}
    </select>
  );
}
