#!/usr/bin/env node
// build-sidebar-index.mjs: one real, prebuilt JSON tree per (provider,
// version) -- public/sidebar/<provider>/<version>.json -- every real
// service group (label), each carrying its own real resources and data
// sources. UBI-240's own "one navigation surface, not two": the
// provider home's service-group card grid is gone; this same tree is
// what the persistent sidebar (ProviderSidebar) renders on every page
// for that provider/version, provider home and resource detail alike,
// the way Terraform's own provider docs do it.
//
// A static file fetched client-side, not embedded per-page, on
// purpose: AWS alone covers 6,241 real resources and data sources
// combined. Embedding that full tree in every one of AWS's own
// ~12,241 real static pages would multiply a few hundred KB by five
// figures -- fetched once instead (this file, cached by the browser
// across every page of one provider/version, exactly the
// public/search-index.json precedent already established here) it's
// paid once per real visit, not once per page.
//
// Runs after fetch-docs.mjs in the prebuild step, reads the exact same
// .docs-cache/ directory every other build script reads, never the
// network directly.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cacheRoot = join(repoRoot, ".docs-cache");
const configPath = join(repoRoot, "config", "providers.json");
const outRoot = join(repoRoot, "public", "sidebar");

function pascalCase(localName) {
  return localName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function listCachedVersions(providerKey) {
  const dir = join(cacheRoot, providerKey);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// UBI-245: categories.json override coverage is now complete (every
// real resource and data source across all seven providers carries a
// real, authored label -- verified live, zero remaining gaps). The
// inference this function used to do (single-label inheritance across
// a service's own sibling wire types, and beneath that a naive
// titleCase(service) guess) existed only to paper over incomplete
// coverage, and it hid the gap: an uncovered wire type rendered inside
// a plausible-looking group instead of surfacing as uncovered. Now
// that coverage is real, a wire type with no override is not silently
// guessed -- it surfaces honestly in its own UNCATEGORIZED_LABEL
// group, which should be empty in steady state and is a visible signal
// (not a silent one) the moment a new resource or data source ships
// ahead of its own real category label. Duplicated here rather than
// imported from lib/docs.ts, matching this codebase's own established
// convention (build-search-index.mjs and build-examples.mjs both
// already duplicate their own small slice of shared pure logic rather
// than importing the TS-only lib/ modules into a plain .mjs script).
const UNCATEGORIZED_LABEL = "Uncategorized";

function resolveCategory(override) {
  return override ?? UNCATEGORIZED_LABEL;
}

function buildTreeFor(providerKey, version) {
  const schemaPath = join(cacheRoot, providerKey, version, "schema", "schema.json");
  const categoriesPath = join(cacheRoot, providerKey, version, "artifacts", "categories.json");
  if (!existsSync(schemaPath)) return null;

  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const categories = existsSync(categoriesPath)
    ? JSON.parse(readFileSync(categoriesPath, "utf8"))
    : { overrides: {} };
  const overrides = categories.overrides ?? {};

  const byLabel = new Map();
  let categorizedCount = 0;
  for (const [wireType, entry] of Object.entries(schema)) {
    const isDataSource = wireType.startsWith("data_");
    const categoryKey = isDataSource ? wireType.slice("data_".length) : wireType;
    const override = overrides[categoryKey]?.label;
    if (override) categorizedCount++;
    const label = resolveCategory(override);
    let group = byLabel.get(label);
    if (!group) {
      group = { label, resources: [], dataSources: [] };
      byLabel.set(label, group);
    }
    const item = {
      service: entry.service,
      localName: entry.localName,
      dottedName: `${entry.service}.${pascalCase(entry.localName)}`,
    };
    if (isDataSource) group.dataSources.push(item);
    else group.resources.push(item);
  }

  const groups = [...byLabel.values()];
  for (const g of groups) {
    g.resources.sort((a, b) => a.dottedName.localeCompare(b.dottedName));
    g.dataSources.sort((a, b) => a.dottedName.localeCompare(b.dottedName));
  }
  groups.sort((a, b) => a.label.localeCompare(b.label));

  const total = Object.keys(schema).length;
  return {
    groups,
    coverage: { total, categorized: categorizedCount },
  };
}

function main() {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  let written = 0;
  for (const providerKey of Object.keys(config.providers)) {
    for (const version of listCachedVersions(providerKey)) {
      const tree = buildTreeFor(providerKey, version);
      if (!tree) continue;
      const dir = join(outRoot, providerKey);
      mkdirSync(dir, { recursive: true });
      const outPath = join(dir, `${version}.json`);
      writeFileSync(outPath, JSON.stringify(tree));
      written++;
      const { total, categorized } = tree.coverage;
      const uncategorized = total - categorized;
      const flag = uncategorized > 0 ? ` -- ${uncategorized} UNCATEGORIZED` : "";
      console.log(
        `[build-sidebar-index] ${providerKey}@${version}: ${tree.groups.length} group(s), ` +
          `${categorized}/${total} categorized${flag} -> ${outPath}`,
      );
    }
  }
  console.log(`[build-sidebar-index] wrote ${written} sidebar file(s)`);
}

main();
