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

// UBI-245's own real, found-live cause, generalized after checking
// data-source-only sidebar groups directly against the schema
// (real, confirmed live, not assumed): categories.json's override
// coverage is not just occasionally partial, it is systematically
// asymmetric between resources and data sources -- real, measured
// coverage across all seven providers: resources 90-100% covered,
// data sources as low as 1.1% (AWS) and 5.1% (Google). A service whose
// resources are fully covered under one real product label but whose
// data sources have NO override at all splits into two groups: the
// real label (all resources) and a naive titleCase(service) fallback
// (all data sources) -- confirmed live, e.g. AWS's real apigateway
// service: "Amazon API Gateway" (37 resources, 0 data sources shown)
// and a separate "Apigateway" (0 resources, 28 data sources) -- the
// SAME real service, not two. This is a stronger case than a same-
// word casing mismatch (AWS's own "uxc" -> "UXC" vs "Uxc"), the
// original, narrower version of this fix only caught -- "Apigateway"
// and "Amazon API Gateway" don't collide case-insensitively at all.
//
// Fixed generally: if every wire type of a service that DOES carry a
// real override agrees on exactly ONE distinct label, an uncovered
// wire type of that SAME service adopts that one real label too,
// regardless of whether its own naive fallback happens to resemble it.
// Deliberately still narrow where the schema itself doesn't agree
// which label a service belongs to -- AWS's own ec2 legitimately
// carries four distinct real labels across its own covered wire types
// ("Amazon EC2", "Amazon VPC", "AWS Transit Gateway", "AWS Verified
// Access"), confirmed live; an uncovered ec2 wire type still falls
// back to the honest "Ec2" rather than guessing which of the four it
// belongs to. Duplicated here rather than imported from lib/docs.ts,
// matching this codebase's own established convention (build-search-
// index.mjs and build-examples.mjs both already duplicate their own
// small slice of shared pure logic rather than importing the TS-only
// lib/ modules into a plain .mjs script).
function resolveCategory(service, override, realLabelsByService) {
  if (override) return override;
  const real = realLabelsByService.get(service);
  if (real && real.size === 1) return [...real.values()][0];
  return titleCase(service);
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
