#!/usr/bin/env node
// fetch-docs.mjs: mirror-then-cache-then-verify, the same real discipline
// ubiquex's own provider.AcquireSchema already uses for schema snapshots
// (provider/acquireschema.go) -- reused here rather than building a
// second mechanism (UBI-240's own explicit instruction). Runs before
// `next build` (the "prebuild" npm script): every page this site renders
// reads from the local cache directory this script fills, never the
// network directly -- the site build itself has no fetch logic of its
// own.
//
// Three sources, checked in order, per (provider, version):
//   1. UBX_DOCS_MIRROR/<provider>/<version>/ -- a local directory an
//      operator put there, used as-is, no download, no checksum check.
//      Mirrors UBX_SCHEMA_MIRROR's own trust model exactly: a local
//      override is trusted differently than a network download.
//   2. .docs-cache/<provider>/<version>/ -- a previously-verified entry.
//      Once verified, always verified: never re-downloaded or
//      re-verified on a cache hit.
//   3. A real GitHub Release: repos/<repo>/releases/tags/v<version>,
//      asset docs.tar.gz + SHA256SUMS. Downloaded, the archive's own
//      SHA-256 checked against SHA256SUMS's own real digest before
//      anything is extracted, then unpacked into the cache.
//
// Never a silent network call -- one printed receipt line per
// (provider, version), naming exactly which of the three sources it
// came from.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cacheRoot = join(repoRoot, ".docs-cache");
const configPath = join(repoRoot, "config", "providers.json");

const githubAPIBase = process.env.UBX_DOCS_GITHUB_API_BASE ?? "https://api.github.com";

function readManifest(dir) {
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function fromMirror(provider, version) {
  const mirrorRoot = process.env.UBX_DOCS_MIRROR;
  if (!mirrorRoot) return null;
  const mirrorDir = join(mirrorRoot, provider, version);
  const manifest = readManifest(mirrorDir);
  if (!manifest) return null;

  // lib/docs.ts only ever reads from .docs-cache -- it has no mirror
  // awareness of its own, by design (one real place the site build
  // reads from, regardless of which of the three sources actually
  // supplied it). A mirror hit still copies here, trusted as-is, no
  // checksum -- the copy is bookkeeping, not verification.
  const dir = join(cacheRoot, provider, version);
  mkdirSync(dir, { recursive: true });
  cpSync(mirrorDir, dir, { recursive: true });
  return { dir, manifest, source: "mirror" };
}

function fromCache(provider, version) {
  const dir = join(cacheRoot, provider, version);
  const manifest = readManifest(dir);
  if (!manifest) return null;
  return { dir, manifest, source: "cache" };
}

// A real GITHUB_TOKEN, when present (CI always has one via
// ${{ github.token }}), authenticates every request -- avoids the
// unauthenticated API's own lower rate limit and, confirmed live
// (UBI-240 slice 2), its own real propagation lag for a release only
// seconds old (the authenticated `gh api` path returned the same
// release cleanly while the anonymous path 504'd for several minutes).
// Optional everywhere else -- a local `npm run dev` with no token set
// still works, just against the same limits any anonymous caller has.
const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

function ghHeaders(accept) {
  const headers = { Accept: accept };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
  return headers;
}

async function ghJSON(path) {
  const res = await fetch(`${githubAPIBase}${path}`, {
    headers: ghHeaders("application/vnd.github+json"),
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function downloadAsset(url) {
  const res = await fetch(url, {
    headers: ghHeaders("application/octet-stream"),
  });
  if (!res.ok) {
    throw new Error(`download ${url}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// expectedSHA256 parses SHA256SUMS' own real "<hex digest>  <filename>"
// per-line format -- the same real format and shape ubiquex's own
// verify.go already parses for the OpenTofu-registry SHA256SUMS
// convention, reused here since the file shape, not its signer, is what
// this parsing depends on.
function expectedSHA256(sumsText, filename) {
  for (const line of sumsText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [digest, name] = trimmed.split(/\s+/);
    if (name === filename || name === `*${filename}`) return digest;
  }
  throw new Error(`SHA256SUMS has no entry for ${filename}`);
}

async function fromRelease(provider, repo, version) {
  const release = await ghJSON(`/repos/${repo}/releases/tags/v${version}`);
  const archiveAsset = release.assets?.find((a) => a.name === "docs.tar.gz");
  const sumsAsset = release.assets?.find((a) => a.name === "SHA256SUMS");
  if (!archiveAsset || !sumsAsset) {
    throw new Error(
      `release v${version} on ${repo} is missing docs.tar.gz or SHA256SUMS -- has: ${(release.assets ?? []).map((a) => a.name).join(", ") || "(no assets)"}`,
    );
  }

  const archive = await downloadAsset(archiveAsset.browser_download_url);
  const sumsText = (await downloadAsset(sumsAsset.browser_download_url)).toString("utf8");
  const want = expectedSHA256(sumsText, "docs.tar.gz");
  const got = createHash("sha256").update(archive).digest("hex");
  if (got !== want) {
    throw new Error(
      `docs.tar.gz for ${repo}@v${version} failed checksum verification: want ${want}, got ${got} -- refusing to extract`,
    );
  }

  const dir = join(cacheRoot, provider, version);
  mkdirSync(dir, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), "ubx-docs-fetch-"));
  const archivePath = join(scratch, "docs.tar.gz");
  writeFileSync(archivePath, archive);
  execFileSync("tar", ["xzf", archivePath, "-C", dir]);
  rmSync(scratch, { recursive: true, force: true });

  const manifest = readManifest(dir);
  if (!manifest) {
    throw new Error(`${repo}@v${version}: extracted archive has no manifest.json at its own root`);
  }
  return { dir, manifest, source: "release", sha256: got };
}

async function fetchOne(providerKey, providerCfg, version) {
  const mirror = fromMirror(providerKey, version);
  if (mirror) {
    console.log(`[fetch-docs] ${providerKey}@${version}: from UBX_DOCS_MIRROR (${mirror.dir}), trusted as-is`);
    return mirror;
  }
  const cached = fromCache(providerKey, version);
  if (cached) {
    console.log(`[fetch-docs] ${providerKey}@${version}: from cache (${cached.dir}), already verified`);
    return cached;
  }
  const fetched = await fromRelease(providerKey, providerCfg.repo, version);
  console.log(
    `[fetch-docs] ${providerKey}@${version}: downloaded from ${providerCfg.repo} release v${version}, verified sha256:${fetched.sha256}`,
  );
  return fetched;
}

async function main() {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const results = [];
  for (const [providerKey, providerCfg] of Object.entries(config.providers)) {
    for (const version of providerCfg.versions) {
      results.push({ provider: providerKey, version, ...(await fetchOne(providerKey, providerCfg, version)) });
    }
  }
  console.log(`[fetch-docs] ${results.length} (provider, version) pair(s) ready in ${cacheRoot}`);
}

main().catch((err) => {
  console.error(`[fetch-docs] ${err.message}`);
  process.exit(1);
});
