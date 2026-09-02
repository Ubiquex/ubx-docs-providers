# CLAUDE.md -- ubx-docs-providers

## What this is

Provider reference documentation for `ubx` (UBI-240): a Next.js site,
[providers.ubiquex.io](https://providers.ubiquex.io), that holds no
content of its own. Every page renders at build time from a docs
artifact fetched from the real SDK repo it describes (`ubx-sdk-<provider>`'s
own GitHub Release, `docs.tar.gz` + `SHA256SUMS`) -- the schema dump
plus the descriptions/intros/categories/exclusions artifacts, never
rendered pages. Sealed per version, matching Terraform's own provider
docs: a typo fix needs a new SDK release, the same as any other content
change.

`config/providers.json` is the only place that says which providers and
which versions this site serves -- a committed list, not a live
release-list query per repo per build (a build that queries live lists
produces different output depending on when it runs). Adding a version
is a one-line change, visible in review.

`scripts/fetch-docs.mjs` is the one place this site touches the
network: mirror-then-cache-then-verify, the same real discipline
`ubiquex`'s own `provider.AcquireSchema` (`provider/acquireschema.go`)
already uses for schema snapshots, reused here rather than building a
second mechanism. `UBX_DOCS_MIRROR` overrides with a trusted local
directory (no checksum, matching `UBX_SCHEMA_MIRROR`'s own precedent);
`.docs-cache/` is gitignored, always rebuilt.

## Slice 1 (UBI-240): proved the mechanism

Kubernetes only, three page types (landing, provider home, one real
resource page), one version. Confirmed real: fetch, checksum, render
at build time all work end to end.

**A real, live finding from building slice 1**: the currently
published `ubx-sdk-kubernetes` README states 92 resources and 116 data
sources. A fresh `ubx sdk gen --dump-ir` against the same live,
pinned-version (3.0.1) kubernetes provider found 92 resources but only
75 data sources -- traced directly, not assumed: every one of the 41
missing entries is a `_list` variant (73 real `_list` data sources in
the published repo, zero in a fresh dump), and even the non-list count
disagrees (75 fresh vs. 43 published). Filed separately as UBI-241 --
not this repo's job to fix, and this site's own manifest.json
correctly reflects the fresher, lower, live number (75), not the stale
published one.

## Slice 2 (UBI-240): the rest of Kubernetes, two real versions

Every real resource (92) and data source (75) at every real cached
version, not just the one slice 1 proved the mechanism with. A
per-service listing page (`app/[provider]/[version]/[service]/page.tsx`)
now exists for real, so `ServiceGroupCard` is a working link again.
Data sources live under their own `/data/` URL segment
(`/kubernetes/1.1.0/data/core/namespace`) -- required, not a style
choice: a resource and its same-named data source share the identical
real binding name in every generated SDK (`var Namespace` in both
`kubernetes/core/namespace.go` and `kubernetes/data/core/namespace.go`,
confirmed directly), only the import path distinguishes them, and the
URL has to carry that same distinction.

**Two real versions, not a placeholder second entry.** `v1.0.0` was
cut retroactively: 92 resources (schema content confirmed byte-
identical to v1.1.0's own, same `VERSION` spec-sha256), 0 data sources
-- the data source authoring path (UBI-178) landed after v1.0.0
shipped, so this is what that version actually was, not a fabrication.
Verified live: the same resource page renders identical field content
at both versions; a v1.1.0-only data source page genuinely 404s at
v1.0.0, the exact honest-404 behavior UBI-240's own design calls for.

Search is now the real, prebuilt cross-resource index UBI-240's own
design describes (`scripts/build-search-index.mjs`, `public/search-
index.json`, fetched and filtered client-side by
`components/GlobalSearch.tsx`) -- scoped to the LATEST version per
provider, not every version indexed (a reader searching wants a
resource to use today, not archaeology across old releases; indexing
every version would multiply the index by however many versions each
provider accumulates for no real benefit).

**Two real bugs found by testing, not assumed away:**
- `artifacts/descriptions.json`'s own real value shape is `{source,
  text}` for every entry (16,421 of them, confirmed by counting, not a
  mix with bare strings) -- an earlier pass assumed a flat string map
  without checking and it crashed the build the moment a real object
  reached React as a child. Fixed in `lib/docs.ts`'s own
  `fieldDescription`.
- `artifacts/categories.json`'s own `overrides` are keyed WITHOUT the
  `data_` prefix even for a data source -- a data source's own category
  silently fell through to the raw service name until this was checked
  directly against the real file. Fixed in both `lib/docs.ts` and
  `scripts/build-search-index.mjs`.
- `fetch-docs.mjs` now sends `GITHUB_TOKEN`/`GH_TOKEN` when present
  (CI always has one) -- a brand-new release's own anonymous API path
  504'd for several minutes while the authenticated path resolved it
  immediately, confirmed live cutting `v1.0.0`.

AWS held pending its own service-group-count problem (299 groups,
UBI-240's own "Open from the design pass") getting designed first --
not started, not this repo's concern yet.

## Slice 3 (UBI-240): the AWS service-group problem, AWS brought in

**Design, applied before AWS touched anything real:** the provider home
page's "Service groups" section was a static CSS grid -- fine at
Kubernetes's 22, an unnavigable wall at hundreds. Replaced with
`ServiceGroupBrowser` (client component): a text filter over label/
service, plus (when not filtering) an A-Z jump nav and sticky
alphabetical section headers over the label-sorted groups. Same code
path at 22 groups or 500+ -- nothing branches on provider identity or
count. Rejected alphabetical-sections-alone (still a lot to scan once
you know the name), filter-alone (no help browsing without a name),
and pagination/virtualization (solves a rendering-performance problem
this dataset doesn't have -- a few hundred flat DOM nodes is nothing;
the real problem is human wayfinding).

Brought this in required generalizing the site off its Kubernetes-only
hardcoding: `generateStaticParams` in every page now loops
`Object.keys(listProviders())`, not a literal `"kubernetes"`. Example-
code generation (`lib/examples.ts`, new -- one shared implementation for
the resource page, the data-source page, and the provider home page's
own "Get started" example, replacing three near-identical copies) reads
a real `goModule` field from `config/providers.json` instead of
hardcoding `.../sdk/go/kubernetes` -- AWS's own `sdk/go/go.mod` module
path genuinely differs (`.../sdk/go/v2`), confirmed directly, not
assumed uniform. The home page's own starter example now picks the real
resource with the fewest required fields per provider
(`pickStarterResource`) rather than a hardcoded Kubernetes Namespace --
deliberately keeps the field body as a `// ...` placeholder rather than
fabricating a plausible-looking real value across arbitrary field types
and three languages, which risks looking correct while being wrong.

**AWS's docs artifact step differs from Kubernetes's own real one, for
a real reason.** Kubernetes fetches a fresh, live, single-URL OpenAPI
schema at publish time -- deliberately fresher than any pinned
snapshot, which is exactly how slice 1 caught the real 75-vs-116 data
source drift (UBI-241). AWS has no lightweight live equivalent: its
real schema is two separate sources (the CloudFormation registry zip,
the Smithy service models) merged only at snapshot-cut time via
`ubx-provider-dynamic`'s own `--generate-snapshot-group` --
`hash-watch.yml`'s own "CFN half"/"Smithy half" split names this
directly. Re-implementing that merge live inside `publish.yml` would
duplicate `hash-watch.yml`'s own logic a second time. Uses the already-
pinned, already-published `ubx-schema-aws` snapshot instead (the exact
same `source`/`version` pin `sdk/providers/.ubx/config` already trusts
for real generation), so docs content is provably identical to what
the release actually ships.

**What AWS revealed, measured for real, not estimated:**
- Real scale: 1715 resources, 4526 data sources, 6241 total wire types,
  across 503 distinct raw service keys (not the 299 the design pass
  estimated -- that number was the resource side alone; data sources
  add ~200 more distinct service directories on top).
- **A real, separate bug, filed as UBI-242, not fixed here:** 51 of
  those 503 service keys are the same real AWS service spelled two
  ways (`access_analyzer` vs `accessanalyzer`, `acm_pca` vs `acmpca`,
  49 more) because the CFN and Smithy sources normalize multi-word
  service names differently. Confirmed live in the currently published
  `ubx-sdk-aws` v2.1.0 code itself (`sdk/go/aws/` vs
  `sdk/go/aws/data/`), not just this session's own fresh dump -- this
  has been true since the SDK was first generated. The docs site
  renders this honestly (two real, separate group pages for the same
  real service) rather than silently merging groups based on a guessed
  normalization -- the wrong layer to fix it in, and the wrong ticket.
- Real artifact size: ~479MB extracted (schema dump ~466MB, dominated
  by 6242 per-resource field files averaging 63KB each -- the three
  largest are QuickSight's own deeply-nested dashboard/analysis/
  template definitions at ~68-70KB each -- plus the combined
  `schema.json` index alone at 76MB), more than double the 212MB
  estimate. Compresses to 14MB in the real release asset.
- **A real build-time bug found and fixed before it mattered, not
  after:** `loadSchemaIndex`/`loadCategories`/`loadIntros` in
  `lib/docs.ts` had no cache -- fine re-parsing a small file per call at
  Kubernetes's ~167 resources+data sources, but every resource/data-
  source page also calls `listResources` again for its own sibling
  list, so an uncached 76MB `schema.json` would have been re-parsed on
  the order of thousands of times. Memoized per (provider, version),
  matching `fieldDescription`'s own existing `descriptionsCache`
  pattern, before ever measuring a real AWS build, not discovered by
  waiting for a slow one.
- Real, measured build time with the fix in place: ~28.5s wall clock
  (Next.js parallelized across available cores) for the whole site --
  ~7052 statically generated pages total (549 service-group pages,
  1899 resource pages, 4601 data-source pages, across both providers).
  No build-time blocker at this scale.
- Real `.next` build output: 1.0GB. Real client-side search index with
  AWS included: 1.4MB (6408 entries) -- still a reasonable one-time
  browser fetch, named here as a growth data point for Azure/Google
  stacking on top later.
- A real, non-fatal Next.js warning surfaced only at this file count:
  "overly broad file pattern... matches 26084 files" from
  `lib/docs.ts`'s own dynamic `join(cacheRoot, ...)` calls, part of
  Next's own output file tracing. Build still succeeds; named here for
  whoever next touches deployment sizing, not silently ignored.

## Slice 4 (UBI-240): the remaining five providers, all seven in

Azure, Google, Datadog, GitHub, DigitalOcean brought in, same docs
artifact pattern as AWS (pinned snapshot, not a live fetch, none of the
five have a lightweight live single-URL schema either). Real committed
versions confirmed live against PyPI/npm before use, not assumed from
`package.json` alone: `azure` 1.2.0, `google` 1.3.0, `datadog` 1.3.0,
`github` 1.2.0, `digitalocean` 1.0.0.

**Two real, small bugs caught before they shipped:**
- `ubiquex-docs`'s own `artifacts/` directory names Google's provider
  `gcp`, not `google` -- every other provider's artifacts directory
  matches its `ubx-sdk-<provider>` repo name exactly; confirmed directly
  rather than assumed uniform, fixed in `ubx-sdk-google`'s own
  `publish.yml` before its PR was opened for review.
- `digitalocean` genuinely has no `exclusions.json` in `ubiquex-docs`
  yet (every other provider does). The docs site never reads that file
  today, so its absence isn't a reason to fail a real release --
  `publish.yml`'s own packaging step treats it as optional, required
  files still hard-fail.

**A real, separate bug, filed as UBI-243, not fixed here:** Azure's own
docs artifact is 3.9GB extracted, roughly 20x AWS's. Not because Azure
has more real resources (2718 wire types, fewer than AWS's 6241) -- 51
of 2719 schema files (1.9%), every one a `network_*` resource, are
pathologically large (up to 319MB each) from self-referential ARM
networking types (`Subnet` → `NetworkInterface` → `IPConfiguration` →
`PrivateLinkService` → back to `NetworkInterface`-shaped fields)
inline-expanding without cycle detection, capped at a suspiciously round
51 levels of nesting. Those 51 files alone are 99% of the total 3.9GB;
the other 2668 files have a normal 5KB median, matching every other
provider. Confirmed live that this doesn't hurt the docs site itself:
`JSON.parse` on the worst file is well under half a second, and the
deep `Object` nesting never crosses into a client component boundary
(only shallow, already-computed strings do), so the built page output
for these resources stays small and serves in milliseconds -- verified
directly, not assumed. The real cost is disk, not build time or page
weight, and it belongs in `ubx-provider-dynamic`'s or
`sdk/codegen/ir`'s own `$ref`-flattening logic, not this site.

**All seven providers, real numbers, answering the question this slice
was for:**

| | extracted | resources | data sources |
|---|---|---|---|
| kubernetes | 70MB | 92 | 75 |
| aws | 479MB | 1715 | 4526 |
| azure | 3.9GB | 1106 | 1612 |
| google | 153MB | 1560 | 415 |
| datadog | 16MB | 177 | 445 |
| github | 11MB | 91 | 249 |
| digitalocean | 8.8MB | 59 | 136 |

Combined `.docs-cache`: **4.6GB**. Real, measured `next build` wall
time for all seven together: **~53.5s** -- not meaningfully worse than
half that for two providers (~28.5s in slice 3), since build time
tracks page count and per-file parse cost, not raw disk size, and
Azure's own bloat lives in 51 files that get read once each, not
re-parsed per page. Real page count: ~13,574 statically generated pages
(1214 service-group pages, 4892 resource pages, 7458 data-source
pages, 8 provider-home pages, plus landing). Real `.next` build output:
**2.1GB**. Real client-side search index: **2.9MB**, 12,258 entries.

**What this answers**: the static-render approach holds through all
seven providers as currently configured -- build time stays well under
a minute, and Azure's real disk bloat (UBI-243) does not translate into
build-time or served-page-weight cost, confirmed live rather than
assumed from the extracted size alone. The number that would actually
threaten this approach is `.docs-cache` continuing to grow per real
schema-generation bug rather than real provider scale -- worth watching
if UBI-243's own root cause turns out not to be unique to Azure
networking.

## Git rules

PR-only, never self-merge, matching every repo in this org except
`ubiquex` itself and `ubiquex-docs`. Before pushing more commits to a
branch with an open PR, confirm it is STILL open (`gh pr list --state
open` or `gh pr view <n>`) -- a merged PR's branch looks identical to
any other from `git status` alone. NO AI attribution anywhere in
commits or PR bodies.

## Real, working commands

```bash
npm run fetch-docs   # mirror-then-cache-then-verify, populates .docs-cache/
npm run dev          # fetch-docs, then next dev
npm run build        # fetch-docs (via the prebuild script), then next build
npm run lint
```
