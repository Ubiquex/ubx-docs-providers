"use client";

import { useRouter } from "next/navigation";

export function VersionSelector({
  provider,
  service,
  resource,
  isDataSource,
  versions,
  current,
}: {
  provider: string;
  service: string;
  resource: string;
  isDataSource: boolean;
  versions: string[];
  current: string;
}) {
  const router = useRouter();
  const segment = isDataSource ? "data" : null;

  return (
    <select
      value={current}
      onChange={(e) => {
        const parts = [provider, e.target.value, segment, service, resource].filter(Boolean);
        router.push("/" + parts.join("/"));
      }}
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
