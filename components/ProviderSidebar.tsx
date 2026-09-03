"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SidebarItem = { service: string; localName: string; dottedName: string };
type SidebarGroup = { label: string; resources: SidebarItem[]; dataSources: SidebarItem[] };
type SidebarCoverage = { total: number; categorized: number };
type SidebarData = { groups: SidebarGroup[]; coverage?: SidebarCoverage };

function itemHref(providerKey: string, version: string, service: string, localName: string, isDataSource: boolean) {
  const base = isDataSource ? `/${providerKey}/${version}/data` : `/${providerKey}/${version}`;
  return `${base}/${service}/${localName}`;
}

// ProviderSidebar: the one real navigation surface for a provider's
// own service groups, UBI-240's own "the way Terraform's provider
// docs do it" -- the full service list in the left nav, each
// expanding to its Resources and Data sources, present on the
// provider home page and every resource/data-source detail page
// alike. Replaces the provider home's own service-group card grid
// (which duplicated this exact navigation, plus carried a real,
// twice-fixed count-correctness bug the cards themselves couldn't
// really escape) and the resource detail page's own single-service
// sibling list (now just this same tree, arriving already scrolled to
// and expanded on the group the reader is actually in).
//
// Fetches the real, prebuilt public/sidebar/<provider>/<version>.json
// (build-sidebar-index.mjs) once per (provider, version) -- not
// embedded per-page. AWS alone is thousands of real resources and data
// sources across hundreds of groups; embedding that in each of AWS's
// own ~12,241 real static pages would multiply a few hundred KB by
// five figures. Fetched once, the browser caches it across every page
// of that provider and version, the same real precedent
// public/search-index.json already established here.
//
// The coverage line (UBI-245) reads the same tree's own `coverage`
// field, present on every page this sidebar renders on -- the real
// product-page statement the design calls for is this line, not a
// separate page, since the site no longer has a standalone page per
// service group (dropped when the provider home's card grid became
// this shared sidebar). A wire type with no real categories.json
// override renders honestly under "Uncategorized" rather than a
// guessed label; this line is what tells a reader that group exists
// and why, rather than leaving them to notice a suspicious label on
// their own.
export function ProviderSidebar({
  providerKey,
  version,
  current,
}: {
  providerKey: string;
  version: string;
  current?: { service: string; localName: string; isDataSource: boolean };
}) {
  const [data, setData] = useState<SidebarData | null>(null);
  const [query, setQuery] = useState("");
  // Manual toggles only -- the group the reader is actually on (via
  // `current`) is derived at render time in isGroupOpen below, never
  // stored here. Storing it here too would need a second effect just
  // to set it once the real tree loads, the exact "setState inside an
  // effect just to mirror something already derivable" shape this
  // codebase's own lint config (react-hooks/set-state-in-effect)
  // flags for good reason: it's a real extra render for no real gain.
  const [openLabels, setOpenLabels] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/sidebar/${providerKey}/${version}.json`)
      .then((r) => r.json())
      .then((d: SidebarData) => setData(d))
      .catch(() => setData({ groups: [] }));
  }, [providerKey, version]);

  // Scrolls to the group the reader is actually on, once the real tree
  // has loaded -- current is only ever set on a resource detail page,
  // never the provider home, which has nothing "current". Pure DOM
  // side effect, no setState -- see isGroupOpen for why the group's
  // own open/closed state doesn't need one either.
  useEffect(() => {
    if (!data || !current) return;
    const list = current.isDataSource ? "dataSources" : "resources";
    const group = data.groups.find((g) =>
      g[list].some((r) => r.service === current.service && r.localName === current.localName),
    );
    if (!group) return;
    document.querySelector(`[data-sidebar-group="${CSS.escape(group.label)}"]`)?.scrollIntoView({ block: "center" });
    // `current` itself is deliberately not a dependency -- every real
    // caller passes a fresh object literal each render, so depending
    // on its identity would re-run this effect (and re-scroll) on
    // every render instead of only when the resource it names actually
    // changes. The three primitive fields below are what actually
    // matter and are already covered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, current?.service, current?.localName, current?.isDataSource]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const groups = data?.groups ?? [];
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        g.resources.some((r) => r.dottedName.toLowerCase().includes(q)) ||
        g.dataSources.some((r) => r.dottedName.toLowerCase().includes(q)),
    );
  }, [data, q]);

  function toggle(label: string) {
    setOpenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  // A group is open if the reader expanded it manually, if a filter is
  // active (filtered results show fully expanded, matching this site's
  // own established filter convention), or if it's the group `current`
  // -- the resource the reader is actually looking at -- belongs to.
  function isGroupOpen(group: SidebarGroup) {
    if (q || openLabels.has(group.label)) return true;
    if (!current) return false;
    const list = current.isDataSource ? group.dataSources : group.resources;
    return list.some((r) => r.service === current.service && r.localName === current.localName);
  }

  function isCurrent(item: SidebarItem, isDataSource: boolean) {
    return (
      !!current &&
      current.isDataSource === isDataSource &&
      current.service === item.service &&
      current.localName === item.localName
    );
  }

  function renderItems(items: SidebarItem[], isDataSource: boolean) {
    return (
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={`${isDataSource ? "data" : "resource"}-${item.service}-${item.localName}`}>
            <Link
              href={itemHref(providerKey, version, item.service, item.localName, isDataSource)}
              className={
                isCurrent(item, isDataSource)
                  ? "-ml-1 block rounded-r-full bg-primary/10 py-1 pl-6 pr-3 text-sm font-medium text-primary"
                  : "-ml-1 block rounded-r-full py-1 pl-6 pr-3 text-sm text-foreground-muted hover:bg-surface hover:text-primary"
              }
            >
              {item.dottedName}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  const coverage = data?.coverage;
  const uncategorized = coverage ? coverage.total - coverage.categorized : 0;

  return (
    <nav className="hidden lg:block">
      {coverage && (
        <p className="mb-2 text-xs text-foreground-muted">
          {coverage.categorized} of {coverage.total} resources and data sources carry a real
          product category.
          {uncategorized > 0 && (
            <>
              {" "}
              The remaining {uncategorized} appear under{" "}
              <span className="font-medium text-foreground">Uncategorized</span>, not guessed
              into a group.
            </>
          )}
        </p>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={data ? `Filter ${data.groups.length} service groups...` : "Loading..."}
        className="w-full rounded-full bg-field px-4 py-2 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:ring-2 focus:ring-primary/30"
      />
      <div className="mt-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
        {filtered.map((group) => {
          const open = isGroupOpen(group);
          return (
            <div key={group.label} data-sidebar-group={group.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-foreground hover:text-primary"
              >
                <span className="inline-block w-3 shrink-0 text-foreground-muted">{open ? "▾" : "▸"}</span>
                {group.label}
              </button>
              {open && (
                <div className="pl-1">
                  {group.resources.length > 0 && (
                    <div className="mt-1">
                      <h4 className="px-2 text-xs font-bold uppercase tracking-wide text-foreground">
                        Resources
                      </h4>
                      {renderItems(group.resources, false)}
                    </div>
                  )}
                  {group.dataSources.length > 0 && (
                    <div className="mt-2">
                      <h4 className="px-2 text-xs font-bold uppercase tracking-wide text-foreground">
                        Data sources
                      </h4>
                      {renderItems(group.dataSources, true)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {data && filtered.length === 0 && (
          <p className="px-2 text-sm text-foreground-muted">No service groups match.</p>
        )}
      </div>
    </nav>
  );
}
