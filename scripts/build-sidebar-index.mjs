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
// purpose: AWS alone has 651 groups covering 6,241 real resources and
// data sources combined. Embedding that full tree in every one of
// AWS's own ~12,241 real static pages would multiply a few hundred KB
// by five figures -- fetched once instead (this file, cached by the
// browser across every page of one provider/version, exactly the
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

function titleCase(s) {
  return s
    .split(/[_-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" ");
}

function listCachedVersions(providerKey) {
  const dir = join(cacheRoot, providerKey);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// Same real, found-live fix as lib/docs.ts's own listResources carried
// (UBI-240): categories.json's own override coverage is routinely
// partial within one real service -- some of a service's own wire
// types carry a real override, others don't and fall through to
// titleCase(service), and when that fallback's naive casing doesn't
// match the override's real casing, one real service splits across
// two label strings differing only by casing (AWS's own "uxc" ->
// "UXC" for one wire type, "Uxc" for two uncovered ones). Duplicated
// here rather than imported from lib/docs.ts, matching this codebase's
// own established convention (build-search-index.mjs and
// build-examples.mjs both already duplicate their own small slice of
// shared pure logic rather than importing the TS-only lib/ modules
// into a plain .mjs script).
function resolveCategory(service, override, realLabelsByService) {
  if (override) return override;
  const fallback = titleCase(service);
  const real = realLabelsByService.get(service)?.get(fallback.toLowerCase());
  return real ?? fallback;
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

  const realLabelsByService = new Map();
  for (const [wireType, entry] of Object.entries(schema)) {
    const categoryKey = wireType.startsWith("data_") ? wireType.slice("data_".length) : wireType;
    const label = overrides[categoryKey]?.label;
    if (!label) continue;
    let byLower = realLabelsByService.get(entry.service);
    if (!byLower) {
      byLower = new Map();
      realLabelsByService.set(entry.service, byLower);
    }
    if (!byLower.has(label.toLowerCase())) byLower.set(label.toLowerCase(), label);
  }

  const byLabel = new Map();
  for (const [wireType, entry] of Object.entries(schema)) {
    const isDataSource = wireType.startsWith("data_");
    const categoryKey = isDataSource ? wireType.slice("data_".length) : wireType;
    const override = overrides[categoryKey]?.label;
    const label = resolveCategory(entry.service, override, realLabelsByService);
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
  return { groups };
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
      console.log(
        `[build-sidebar-index] ${providerKey}@${version}: ${tree.groups.length} group(s) -> ${outPath}`,
      );
    }
  }
  console.log(`[build-sidebar-index] wrote ${written} sidebar file(s)`);
}

main();
