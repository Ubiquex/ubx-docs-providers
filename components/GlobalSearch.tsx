"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IndexEntry = {
  provider: string;
  providerName: string;
  wireType: string;
  dottedName: string;
  category: string;
  isDataSource: boolean;
  path: string;
};

// GlobalSearch: "search leads, since finding one resource across
// twelve thousand pages is the main job" (UBI-240's own design pass).
// Fetches the real, prebuilt public/search-index.json (build-search-
// index.mjs) once on mount, then filters entirely client-side --
// exactly the "client-side prebuilt index to start" the ticket itself
// calls for, improved in later phases (relevance ranking, fuzzy match,
// server-assisted search at real scale) once more than one provider's
// worth of content exists to prove that against.
export function GlobalSearch() {
  const [index, setIndex] = useState<IndexEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? index
        .filter(
          (e) =>
            e.dottedName.toLowerCase().includes(q) ||
            e.wireType.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q),
        )
        .slice(0, 20)
    : [];

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources and data sources..."
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
      />
      {q && (
        <div className="absolute z-10 mt-2 w-full rounded-lg border border-border bg-background shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-foreground-muted">No matches for &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border">
              {results.map((r) => (
                <li key={`${r.provider}-${r.wireType}`}>
                  <Link
                    href={r.path}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-surface"
                  >
                    <span>
                      <span className="text-primary">{r.dottedName}</span>
                      <span className="ml-2 text-xs text-foreground-muted">{r.providerName}</span>
                    </span>
                    {r.isDataSource && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-foreground-muted">
                        data
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
