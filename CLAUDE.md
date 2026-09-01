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

## Slice 1 (UBI-240), what's real and what's deliberately not yet

Kubernetes only -- smallest real provider, chosen to prove the fetch/
render/version mechanism before building it wide across all seven.
Three page types: the landing page, the Kubernetes provider home, and
one real resource page (`kubernetes_core_namespace`, chosen for being
small and easy to read end to end). `generateStaticParams` on the
resource route is literal to that one (provider, service, resource)
tuple, not a loop over the whole corpus -- rendering the other 91
resources for real is separately scoped, next-slice work.

Service group cards on the provider home page are deliberately NOT
links this slice (`components/ServiceGroupCard.tsx`'s own doc comment
has the full reasoning) -- a per-service listing page is a fourth page
type slice 1's own scope never included, and linking to one that
doesn't exist would 404 for every group except the one resource
actually built.

Search on the landing page is a real, working client-side filter over
provider cards, not the prebuilt cross-resource search index UBI-240's
own design calls for eventually -- with one provider live, that index
has nothing real to prove yet (`components/ProviderSearch.tsx`'s own
doc comment).

**A real, live finding from building this slice**: the currently
published `ubx-sdk-kubernetes` README states 92 resources and 116 data
sources. A fresh `ubx sdk gen --dump-ir` against the same live,
pinned-version (3.0.1) kubernetes provider found 92 resources but only
75 data sources -- traced directly, not assumed: every one of the 41
missing entries is a `_list` variant (73 real `_list` data sources in
the published repo, zero in a fresh dump), and even the non-list count
disagrees (75 fresh vs. 43 published). This is real, current drift
between the schema this site's own docs artifact was built from and
what's actually checked into the SDK repo -- not something this slice
resolved, reported here so the next session doesn't have to
rediscover it. This site's own manifest.json correctly reflects the
fresher, lower number (75), not the stale published one.

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
