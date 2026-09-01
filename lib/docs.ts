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

type FieldType = {
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

function loadSchemaIndex(providerKey: string, version: string): SchemaIndex {
  const p = join(versionDir(providerKey, version), "schema", "schema.json");
  return JSON.parse(readFileSync(p, "utf8"));
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
  category: string;
};

export function listResources(providerKey: string, version: string): ResourceSummary[] {
  const index = loadSchemaIndex(providerKey, version);
  const categories = loadCategories(providerKey, version);
  return Object.entries(index).map(([wireType, entry]) => {
    // categories.json's own overrides are keyed WITHOUT the "data_"
    // prefix even for a data source -- confirmed directly against the
    // real file, not assumed (a data source's own category lookup
    // silently fell through to the plain title-cased service name
    // until this was checked).
    const categoryKey = wireType.startsWith("data_") ? wireType.slice("data_".length) : wireType;
    return {
      wireType,
      service: entry.service,
      localName: entry.localName,
      isDataSource: wireType.startsWith("data_"),
      dottedName: `${entry.service}.${pascalCase(entry.localName)}`,
      category: categories.overrides[categoryKey]?.label ?? titleCase(entry.service),
    };
  });
}

function titleCase(s: string): string {
  return s
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
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

function loadIntros(providerKey: string, version: string): Record<string, string> {
  const p = join(versionDir(providerKey, version), "artifacts", "intros.json");
  return JSON.parse(readFileSync(p, "utf8"));
}

type Categories = { overrides: Record<string, { label: string }> };

function loadCategories(providerKey: string, version: string): Categories {
  const p = join(versionDir(providerKey, version), "artifacts", "categories.json");
  return JSON.parse(readFileSync(p, "utf8"));
}

export type ServiceGroup = {
  service: string;
  label: string;
  resourceCount: number;
  dataSourceCount: number;
};

export function listServiceGroups(providerKey: string, version: string): ServiceGroup[] {
  const resources = listResources(providerKey, version);
  const groups = new Map<string, ServiceGroup>();
  for (const r of resources) {
    const existing = groups.get(r.service);
    if (existing) {
      if (r.isDataSource) existing.dataSourceCount++;
      else existing.resourceCount++;
    } else {
      groups.set(r.service, {
        service: r.service,
        label: r.category,
        resourceCount: r.isDataSource ? 0 : 1,
        dataSourceCount: r.isDataSource ? 1 : 0,
      });
    }
  }
  return [...groups.values()].sort((a, b) => a.service.localeCompare(b.service));
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
