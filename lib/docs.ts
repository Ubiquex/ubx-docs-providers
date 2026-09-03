// lib/docs.ts reads exactly what scripts/fetch-docs.mjs already put in
// .docs-cache/<provider>/<version>/ -- schema plus artifacts, both real
// inputs, nothing rendered. Every function here runs at build time only
// (Server Components / generateStaticParams), never in the browser --
// this module is never imported from a "use client" file.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import providersConfig from "../config/providers.json";

const cacheRoot = join(process.cwd(), ".docs-cache");

export type ProviderConfig = {
  name: string;
  description: string;
  repo: string;
  tier: "official" | "verified" | "community";
  versions: string[];
  goModule?: string;
};

export function listProviders(): Record<string, ProviderConfig> {
  return providersConfig.providers as Record<string, ProviderConfig>;
}

export function getProvider(providerKey: string): ProviderConfig | undefined {
  return listProviders()[providerKey];
}

// latestVersion is the committed list's own last entry -- the config
// file's own doc comment states the convention: "versions lists every
// version this site serves, latest last."
export function latestVersion(providerKey: string): string | undefined {
  const cfg = getProvider(providerKey);
  if (!cfg || cfg.versions.length === 0) return undefined;
  return cfg.versions[cfg.versions.length - 1];
}

type Manifest = {
  schema_version: number;
  provider: string;
  sdk_version: string;
  resource_count: number;
  data_source_count: number;
};

function versionDir(providerKey: string, version: string): string {
  return join(cacheRoot, providerKey, version);
}

export function getManifest(providerKey: string, version: string): Manifest {
  const p = join(versionDir(providerKey, version), "manifest.json");
  return JSON.parse(readFileSync(p, "utf8"));
}

export function versionExists(providerKey: string, version: string): boolean {
  return existsSync(join(versionDir(providerKey, version), "manifest.json"));
}

export type FieldType = {
  Kind: number;
  Scalar: number;
  Element: FieldType | null;
  Object: Field[] | null;
};

export type Field = {
  WireName: string;
  Type: FieldType;
  Description: string;
  Required: boolean;
  Optional: boolean;
  Computed: boolean;
  Sensitive: boolean;
  DescriptionSource: string;
};

type SchemaEntry = {
  service: string;
  localName: string;
  namespace?: "data";
  ir: { Fields: Field[] };
};

type SchemaIndex = Record<string, SchemaEntry>;

// Memoized per (provider, version) -- unlike Kubernetes's own ~167
// resources+data sources, a provider at AWS's real scale (thousands of
// entries) gets listResources called once per provider/service page
// PLUS once per resource/data-source page (for its own sibling list),
// so an unmemoized re-parse of the combined schema.json on every call
// multiplies real build time by however many pages exist. Matches
// fieldDescription's own existing descriptionsCache pattern below.
const schemaIndexCache: Map<string, SchemaIndex> = new Map();

function loadSchemaIndex(providerKey: string, version: string): SchemaIndex {
  const key = `${providerKey}@${version}`;
  let index = schemaIndexCache.get(key);
  if (!index) {
    const p = join(versionDir(providerKey, version), "schema", "schema.json");
    index = JSON.parse(readFileSync(p, "utf8"));
    schemaIndexCache.set(key, index!);
  }
  return index!;
}

// pascalCase turns a snake_case localName into the dotted SDK form's own
// own last segment -- namespace -> Namespace, mutating_admission_policy
// -> MutatingAdmissionPolicy. Matches ubx sdk gen's own Go identifier
// derivation exactly (blueprint/gogen.go and sdk/codegen's own shared
// naming, both title-case each underscore-separated segment).
function pascalCase(localName: string): string {
  return localName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export type ResourceSummary = {
  wireType: string;
  service: string;
  localName: string;
  isDataSource: boolean;
  dottedName: string; // e.g. "core.Namespace"
};

// category (a categories.json-resolved human label, e.g. "Amazon
// EC2") used to live on this type -- UBI-240's own "drop the service
// group cards" pass removed the provider home's card grid and the
// resource detail page's own single-service sidebar in favor of one
// shared ProviderSidebar, which fetches its own real, prebuilt tree
// (public/sidebar/<provider>/<version>.json, scripts/build-sidebar-
// index.mjs) instead of reading category off a ResourceSummary at
// request time. That build script carries its own copy of the real
// label-resolution fix (categories.json's own partial coverage within
// one service, see that script's own doc comment) -- this module has
// no remaining real reader for `category`, so it's gone rather than
// kept as dead weight two implementations could quietly drift apart
// on.
export function listResources(providerKey: string, version: string): ResourceSummary[] {
  const index = loadSchemaIndex(providerKey, version);
  return Object.entries(index).map(([wireType, entry]) => ({
    wireType,
    service: entry.service,
    localName: entry.localName,
    isDataSource: wireType.startsWith("data_"),
    dottedName: `${entry.service}.${pascalCase(entry.localName)}`,
  }));
}

export type ResourceDetail = ResourceSummary & {
  fields: Field[];
  intro: string | null;
};

// formatFieldType renders a Field's own Type into a short, readable
// string -- Kind/Scalar match sdk/codegen/ir.go's own real enum values
// exactly (KindScalar=1..KindObject=5, ScalarString=1..ScalarDynamic=4),
// not guessed: 0=Invalid, 1=Scalar, 2=List, 3=Set, 4=Map, 5=Object.
const SCALAR_NAMES = ["invalid", "string", "number", "bool", "dynamic"];

export function formatFieldType(t: Field["Type"]): string {
  switch (t.Kind) {
    case 1:
      return SCALAR_NAMES[t.Scalar] ?? "unknown";
    case 2:
      return `list(${t.Element ? formatFieldType(t.Element) : "object"})`;
    case 3:
      return `set(${t.Element ? formatFieldType(t.Element) : "object"})`;
    case 4:
      return `map(${t.Element ? formatFieldType(t.Element) : "object"})`;
    case 5:
      return "object";
    default:
      return "unknown";
  }
}

const KIND_LIST = 2;
const KIND_SET = 3;
const KIND_MAP = 4;
const KIND_OBJECT = 5;

// isObjectIsh/objectFieldsOf/fieldShapeSignature port ubiquex-docs's own
// real Mintlify generator logic (gen_provider_docs.py) verbatim rather
// than reinvent it -- that generator is what produced the nested,
// collapsible field trees this site is matching. True for an object
// type directly, or a list/set/map whose own Element is an object --
// Mintlify's pages already expand one level of container to reach the
// object underneath (e.g. `tags: list(object)` expands straight to
// its object's own fields, not to a meaningless "list" wrapper).
export function isObjectIsh(t: FieldType): boolean {
  if (t.Kind === KIND_OBJECT) return true;
  if ((t.Kind === KIND_LIST || t.Kind === KIND_SET || t.Kind === KIND_MAP) && t.Element?.Kind === KIND_OBJECT) {
    return true;
  }
  return false;
}

export function objectFieldsOf(t: FieldType): Field[] {
  if (t.Kind === KIND_OBJECT) return t.Object ?? [];
  if ((t.Kind === KIND_LIST || t.Kind === KIND_SET || t.Kind === KIND_MAP) && t.Element) {
    return t.Element.Object ?? [];
  }
  return [];
}

// A cheap structural signature (sorted immediate child names) used to
// tell a genuine self-reference (the same object type recurring, real
// cycle) from an unrelated type that happens to share a field name --
// same real distinction ubiquex-docs's own field_shape_signature makes,
// confirmed there against 486 real false positives before it existed.
export function fieldShapeSignature(t: FieldType): string {
  return objectFieldsOf(t)
    .map((f) => f.WireName)
    .sort()
    .join(",");
}

// Same real classification ubiquex-docs's own eff_flags uses: a field
// with all three of Required/Optional/Computed false (seen in the real
// corpus) counts as effectively both optional and computed, so it
// still lands somewhere rather than vanishing from both sections.
function effFlags(f: Field): { effOptional: boolean; effComputed: boolean } {
  const allFalse = !f.Required && !f.Optional && !f.Computed;
  return { effOptional: f.Optional || allFalse, effComputed: f.Computed || allFalse };
}

export type ResourceFieldSplit = { input: Field[]; output: Field[]; hasRealOutputSplit: boolean };

// Matches gen_provider_docs.py's own real split, found-in-review (UBI-
// 175 Phase 6): a resource where nearly every field is BOTH Optional
// and Computed at once (a real, accurate reflection of some providers'
// own shared request/response schema, e.g. Datadog's monitor) would
// otherwise get an "Output properties" section that's a pure subset of
// Input, telling a reader nothing they didn't just read once. Only
// fields Output has that Input genuinely doesn't (output-only) earn a
// real, separate section.
export function splitResourceFields(fields: Field[]): ResourceFieldSplit {
  const byName = (a: Field, b: Field) => a.WireName.localeCompare(b.WireName);
  const input = fields.filter((f) => f.Required || effFlags(f).effOptional).sort(byName);
  const output = fields.filter((f) => effFlags(f).effComputed).sort(byName);
  const inputNames = new Set(input.map((f) => f.WireName));
  const hasRealOutputSplit = output.some((f) => !inputNames.has(f.WireName));
  return { input, output, hasRealOutputSplit };
}

export type DataSourceFieldSplit = { lookup: Field[]; result: Field[] };

// Data sources always split, no collapse logic -- matches
// gen_data_source_pages.py's own real, simpler rule exactly (Required
// or not-Computed is a lookup argument, Computed is a result).
export function splitDataSourceFields(fields: Field[]): DataSourceFieldSplit {
  const byName = (a: Field, b: Field) => a.WireName.localeCompare(b.WireName);
  const lookup = fields.filter((f) => f.Required || !f.Computed).sort(byName);
  const result = fields.filter((f) => f.Computed).sort(byName);
  return { lookup, result };
}

// getResourceOrDataSource is the one shared lookup both getResource and
// getDataSource call -- identical logic either way, only the
// isDataSource filter differs, matching this project's own "one
// implementation, not two" discipline rather than two near-identical
// copies that could quietly diverge.
function getResourceOrDataSource(
  providerKey: string,
  version: string,
  service: string,
  localName: string,
  isDataSource: boolean,
): ResourceDetail | undefined {
  const resources = listResources(providerKey, version);
  const summary = resources.find(
    (r) => r.service === service && r.localName === localName && r.isDataSource === isDataSource,
  );
  if (!summary) return undefined;

  const p = join(versionDir(providerKey, version), "schema", `${summary.wireType}.json`);
  const fields: Field[] = JSON.parse(readFileSync(p, "utf8"));
  const intros = loadIntros(providerKey, version);

  return { ...summary, fields, intro: intros[summary.wireType] ?? null };
}

export function getResource(
  providerKey: string,
  version: string,
  service: string,
  localName: string,
): ResourceDetail | undefined {
  return getResourceOrDataSource(providerKey, version, service, localName, false);
}

export function getDataSource(
  providerKey: string,
  version: string,
  service: string,
  localName: string,
): ResourceDetail | undefined {
  return getResourceOrDataSource(providerKey, version, service, localName, true);
}

// Every real entry in artifacts/descriptions.json is {source, text} --
// confirmed directly against the real file (16,421 entries for
// kubernetes@1.1.0, all objects, none a bare string), not the flat
// string map an earlier pass assumed without checking. source records
// provenance (vendor-spec, ai, ai-dictionary, ai-sdk-inferred, per
// ubiquex-docs' own manifest.json) -- this site only ever needs text.
type DescriptionEntry = { source: string; text: string };

const descriptionsCache: Map<string, Record<string, DescriptionEntry>> = new Map();

// fieldDescription looks up "<wire_type>.<field_path>" in artifacts/
// descriptions.json -- lazily loaded and cached per (provider, version)
// for the whole build, since the file itself is multiple megabytes and
// every resource page on a given version needs it.
export function fieldDescription(
  providerKey: string,
  version: string,
  wireType: string,
  fieldPath: string,
): string | null {
  const key = `${providerKey}@${version}`;
  let descriptions = descriptionsCache.get(key);
  if (!descriptions) {
    const p = join(versionDir(providerKey, version), "artifacts", "descriptions.json");
    descriptions = JSON.parse(readFileSync(p, "utf8"));
    descriptionsCache.set(key, descriptions!);
  }
  return descriptions![`${wireType}.${fieldPath}`]?.text ?? null;
}

const introsCache: Map<string, Record<string, string>> = new Map();

function loadIntros(providerKey: string, version: string): Record<string, string> {
  const key = `${providerKey}@${version}`;
  let intros = introsCache.get(key);
  if (!intros) {
    const p = join(versionDir(providerKey, version), "artifacts", "intros.json");
    intros = JSON.parse(readFileSync(p, "utf8"));
    introsCache.set(key, intros!);
  }
  return intros!;
}

// pickStarterResource chooses the real resource the provider home
// page's own "Get started" example builds around -- the one with the
// fewest required fields (ties broken by fewest total fields, then
// dottedName for determinism), not a hardcoded per-provider resource
// name. Reading every resource's own field file once here (called once
// per provider home page render, not per resource page) is cheap next
// to the alternative of guessing a "good" example by hand for six more
// providers as they're brought in.
export function pickStarterResource(
  providerKey: string,
  version: string,
): (ResourceSummary & { fields: Field[] }) | undefined {
  const resources = listResources(providerKey, version).filter((r) => !r.isDataSource);
  let best: (ResourceSummary & { fields: Field[] }) | undefined;
  let bestRequired = Infinity;
  let bestTotal = Infinity;
  for (const r of resources) {
    const p = join(versionDir(providerKey, version), "schema", `${r.wireType}.json`);
    const fields: Field[] = JSON.parse(readFileSync(p, "utf8"));
    const required = fields.filter((f) => f.Required).length;
    if (
      required < bestRequired ||
      (required === bestRequired && fields.length < bestTotal) ||
      (required === bestRequired && fields.length === bestTotal && (!best || r.dottedName < best.dottedName))
    ) {
      best = { ...r, fields };
      bestRequired = required;
      bestTotal = fields.length;
    }
  }
  return best;
}

// listCachedVersions returns every version actually present in
// .docs-cache for a provider -- used by generateStaticParams so a build
// only ever renders pages for versions fetch-docs.mjs actually fetched,
// never silently skips a configured-but-unfetched version.
export function listCachedVersions(providerKey: string): string[] {
  const dir = join(cacheRoot, providerKey);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}
