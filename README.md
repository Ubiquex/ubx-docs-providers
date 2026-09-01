# ubx-docs-providers

Provider reference documentation for [ubx](https://github.com/ubiquex/ubiquex),
served at [providers.ubiquex.io](https://providers.ubiquex.io). A
Next.js site that holds no content of its own: every page renders at
build time from a real docs artifact fetched from the SDK repo it
describes.

Versioned per SDK release, like Terraform's own provider docs: a
reader on `ubx-sdk-aws` 2.1.0 sees that version's pages, sealed, never
edited in place. Fixing a typo means cutting a new SDK version.

## Slice 1 (UBI-240)

Kubernetes only, three page types (landing, provider home, one
resource page), proving the fetch/render/version mechanism before
building it wide across all seven providers. See `CLAUDE.md` for the
full account of what's real and what's deliberately deferred to a
later slice.

## Development

```bash
npm install
npm run dev
```

`npm run dev` fetches the real, live docs artifact for every provider
named in `config/providers.json` before starting the dev server
(`scripts/fetch-docs.mjs`, mirror-then-cache-then-verify against a
real GitHub Release). Set `UBX_DOCS_MIRROR=/path/to/local/docs` to
point at a local, trusted copy instead of the network, matching
`ubiquex`'s own `UBX_SCHEMA_MIRROR` convention.

## Adding a version

Add it to the relevant provider's own `versions` array in
`config/providers.json` (latest last) -- a one-line change, visible in
review. The version must already exist as a real, tagged GitHub
Release (`v<version>`, carrying `docs.tar.gz` + `SHA256SUMS`) on that
provider's own SDK repo before this site can serve it.
