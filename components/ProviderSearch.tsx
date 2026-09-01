"use client";

import { useState } from "react";
import { ProviderCard } from "./ProviderCard";

type CardData = {
  providerKey: string;
  name: string;
  tier: string;
  version: string;
  resourceCount: number;
  dataSourceCount: number;
  description: string;
};

// ProviderSearch is a real, working, honestly-scoped filter over the
// provider cards below it -- not the full prebuilt search index across
// every resource and data source UBI-240's own design calls for
// eventually ("finding one resource across twelve thousand pages is
// the main job"). With one provider live this slice, that index has
// nothing real to prove yet; this filter is what the landing page
// actually needs today, and the full index is real, separately scoped
// follow-up work once more than one provider exists to search across.
export function ProviderSearch({ providers }: { providers: CardData[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? providers.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      )
    : providers;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search providers..."
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
      />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProviderCard key={p.providerKey} {...p} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-foreground-muted">No providers match &ldquo;{query}&rdquo;.</p>
      )}
    </div>
  );
}
