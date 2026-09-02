// lib/examples.ts reads scripts/build-examples.mjs' own real output --
// .docs-cache/<provider>/<version>/examples.json, one real, complete,
// gofmt/deno-fmt-verified program per resource and data source (Go/TS)
// plus a real Python program (unverified by a formatter, matching the
// reference generator's own real behavior there too -- see
// build-examples.mjs's file header for the full account, including its
// two disclosed gaps against the reference).
//
// Generation happens exactly once per build, in the prebuild step --
// this module only ever reads the precomputed result, synchronously,
// at page-render time. Never imported from a "use client" file, same
// discipline as lib/docs.ts.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const cacheRoot = join(process.cwd(), ".docs-cache");

export type LanguageExamples = { go: string; typescript: string; python: string };

type ExamplesFile = Record<string, { go: string; typescript: string; python: string }>;

const examplesCache: Map<string, ExamplesFile> = new Map();

function loadExamples(providerKey: string, version: string): ExamplesFile {
  const key = `${providerKey}@${version}`;
  let examples = examplesCache.get(key);
  if (!examples) {
    const p = join(cacheRoot, providerKey, version, "examples.json");
    examples = JSON.parse(readFileSync(p, "utf8"));
    examplesCache.set(key, examples!);
  }
  return examples!;
}

// Both resource and data-source pages call this the same way -- the
// wireType alone (already "data_"-prefixed for a data source by this
// site's own convention, see lib/docs.ts) is enough to look the real
// precomputed program up, no separate resource/data-source branch
// needed here the way the two build-time generator functions needed
// one (their own real output shape differs -- ubx.Resource vs ubx.Data,
// etc. -- but that's already baked into the precomputed file).
export function exampleFor(providerKey: string, version: string, wireType: string): LanguageExamples {
  const examples = loadExamples(providerKey, version);
  const entry = examples[wireType];
  if (!entry) {
    throw new Error(`no precomputed example for ${providerKey}@${version}/${wireType} -- did build-examples.mjs run?`);
  }
  return entry;
}
