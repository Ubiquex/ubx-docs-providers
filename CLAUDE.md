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
