#!/usr/bin/env node
// build-search-index.mjs: a real, prebuilt JSON index over every
// resource and data source at the LATEST version of each configured
// provider -- UBI-240's own explicit design ("Client-side prebuilt
// index to start, improved in later phases"). Scoped to latest-per-
// provider, not every version: a reader searching is looking for a
// resource to use today, not archaeology across old releases, and
// indexing every version would grow the index by a factor of however
// many versions each provider accumulates for no real benefit. Runs
// after fetch-docs.mjs in the prebuild step -- reads the exact same
// .docs-cache/ directory, never the network directly.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cacheRoot = join(repoRoot, ".docs-cache");
const configPath = join(repoRoot, "config", "providers.json");
const outPath = join(repoRoot, "public", "search-index.json");

function pascalCase(localName) {
  return localName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function buildEntriesFor(providerKey, providerName, version) {
  const schemaPath = join(cacheRoot, providerKey, version, "schema", "schema.json");
  const categoriesPath = join(cacheRoot, providerKey, version, "artifacts", "categories.json");
  if (!existsSync(schemaPath)) return [];

  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const categories = existsSync(categoriesPath)
    ? JSON.parse(readFileSync(categoriesPath, "utf8"))
    : { overrides: {} };

  return Object.entries(schema).map(([wireType, entry]) => {
    const isDataSource = wireType.startsWith("data_");
    const dottedName = `${entry.service}.${pascalCase(entry.localName)}`;
    const path = isDataSource
      ? `/${providerKey}/${version}/data/${entry.service}/${entry.localName}`
      : `/${providerKey}/${version}/${entry.service}/${entry.localName}`;
    // Matches lib/docs.ts's own real fix: categories.json's overrides
    // are keyed WITHOUT the "data_" prefix even for a data source.
    const categoryKey = isDataSource ? wireType.slice("data_".length) : wireType;
    return {
      provider: providerKey,
      providerName,
      wireType,
      dottedName,
      category: categories.overrides[categoryKey]?.label ?? entry.service,
      isDataSource,
      path,
    };
  });
}

function main() {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const index = [];
  for (const [providerKey, cfg] of Object.entries(config.providers)) {
    const latest = cfg.versions[cfg.versions.length - 1];
    const entries = buildEntriesFor(providerKey, cfg.name, latest);
    index.push(...entries);
    console.log(`[build-search-index] ${providerKey}@${latest}: ${entries.length} entries`);
  }
  mkdirSync(join(repoRoot, "public"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(index));
  console.log(`[build-search-index] wrote ${index.length} total entries to ${outPath}`);
}

main();
