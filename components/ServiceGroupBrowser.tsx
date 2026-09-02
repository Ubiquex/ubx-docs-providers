"use client";

import { useMemo, useState } from "react";
import { ServiceGroupCard } from "./ServiceGroupCard";
import type { ServiceGroup } from "@/lib/docs";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function sectionLetter(label: string): string {
  const c = label.trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

// UBI-240 slice 3: a provider with a few hundred service groups (AWS,
// Azure, Google) does not fit the plain grid slice 1/2 proved out for
// Kubernetes's own 22. Filter and alphabetical sections both live here,
// always both present regardless of count -- nothing branches on
// provider identity or group count, so this is the same component at
// 22 groups or 300. Filtering shows a flat result grid (sections stop
// being useful once you're narrowing by name); browsing unfiltered
// shows the A-Z jump nav and sticky section headers instead.
export function ServiceGroupBrowser({ groups }: { groups: ServiceGroup[] }) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...groups].sort((a, b) => a.label.localeCompare(b.label)),
    [groups],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sorted.filter((g) => g.label.toLowerCase().includes(q) || g.service.toLowerCase().includes(q))
    : sorted;

  const sections = useMemo(() => {
    const map = new Map<string, ServiceGroup[]>();
    for (const g of sorted) {
      const letter = sectionLetter(g.label);
      const existing = map.get(letter);
      if (existing) existing.push(g);
      else map.set(letter, [g]);
    }
    return map;
  }, [sorted]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Filter ${groups.length} service groups...`}
        className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
      />

      {q ? (
        <div className="mt-4">
          <p className="text-xs text-foreground-muted">
            {filtered.length} of {groups.length} match &ldquo;{query}&rdquo;
          </p>
          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-foreground-muted">No service groups match.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((g) => (
                <ServiceGroupCard
                  key={g.service}
                  label={g.label}
                  resourceCount={g.resourceCount}
                  dataSourceCount={g.dataSourceCount}
                  firstHref={g.firstHref}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <nav className="sticky top-0 z-10 mt-4 flex flex-wrap gap-1 bg-background py-2">
            {[...ALPHABET, "#"].map((letter) => {
              const active = sections.has(letter);
              return active ? (
                <a
                  key={letter}
                  href={`#group-${letter}`}
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-medium text-primary hover:bg-surface"
                >
                  {letter}
                </a>
              ) : (
                <span
                  key={letter}
                  className="flex h-6 w-6 items-center justify-center text-xs text-foreground-muted opacity-30"
                >
                  {letter}
                </span>
              );
            })}
          </nav>

          {[...sections.entries()].map(([letter, letterGroups]) => (
            <section key={letter} id={`group-${letter}`} className="mt-6 scroll-mt-16">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                {letter}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {letterGroups.map((g) => (
                  <ServiceGroupCard
                    key={g.service}
                    label={g.label}
                    resourceCount={g.resourceCount}
                    dataSourceCount={g.dataSourceCount}
                    firstHref={g.firstHref}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
