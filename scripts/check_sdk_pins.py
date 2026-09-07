#!/usr/bin/env python3
"""Fail when an SDK is stranded between its repo, its release, and this site.

This is the sibling of ubiquex's own sdk/providers/check_pins.py, one
layer up. That one watches a SCHEMA snapshot travelling from
ubx-schema-<p>'s main, to its release, to ubx's pin. This one watches an
SDK travelling the same three-step road:

  1. ubx-sdk-<p>'s committed version   (what a merged regeneration set)
  2. its latest GitHub Release         (what this site can actually fetch)
  3. this site's own versions[] pin    (what readers are actually served)

Nothing watched any gap between them, and on 2026-09-07 every single gap
was open at once. Six SDK regenerations had been merged that day, all of
them recovering data sources that UBI-241 had found missing, and not one
had been published:

    kubernetes    committed 1.1.2   released v1.1.2 (3 days old)   pin 1.1.1
    github        committed 1.2.3   released v1.2.3 (3 days old)   pin 1.2.3
    datadog       committed 1.3.2   released v1.3.2 (3 days old)   pin 1.3.1
    google        committed 1.3.2   released v1.3.2 (3 days old)   pin 1.3.1
    aws           committed 2.2.1   released v2.2.1 (5 days old)   pin 2.2.1
    azure         committed 1.2.3   released v1.2.2 (3 days old)   pin 1.2.1

Four of the eight pins were also behind a release that already existed,
which is a second, older gap nobody had noticed either.

The failure is invisible by construction. lib/ fetches docs.tar.gz from
each pinned version's GitHub Release, so a site whose SDKs were merged
but never published builds green, deploys green, and serves stale
content. It was found only by scraping a version string off a live page
and comparing it against the release list by hand.

WHY THIS COMPARES TREES AND NOT VERSION NUMBERS. The obvious check is
the one its schema-side sibling uses: committed version against released
version. Here that check is nearly blind, and the first draft of this
file shipped it anyway. Of the six repos stranded on 2026-09-07 it
caught exactly one, azure, and only by accident.

The reason is that a regeneration does not touch the version at all.
`ubx sdk gen` deliberately leaves it alone, and publish.yml owns the
bump, writing it into the files and opening a PR AFTER every registry
already has the content. So the normal shape of unpublished work is a
repo whose version files agree with the release perfectly while
sdk/go/ holds thousands of lines nobody can fetch. Comparing the two
numbers reads that as healthy.

Comparing the generated tree instead reads it correctly, because the
tree is the thing that actually changed. sdk/go specifically: it is
pure generated content and carries no version string anywhere, so its
tree hash moves when the SDK moves and never merely because a release
happened. sdk/typescript and sdk/python both hold their own version
manifest, which publish.yml rewrites, so their trees differ after every
ordinary publish and would cry wolf on all eight repos forever.

THE FIVE CONDITIONS, ALL FAILURES, because they are different mistakes:

  MERGED BUT NOT PUBLISHED (sdk/go differs from the latest release).
  Someone merged a regeneration and did not dispatch publish.yml. The
  work exists and no consumer, this site included, can reach it. This
  is the one that bit, six times in one day.

  A VERSION CLAIM WITH NO RELEASE (committed > released). Rarer, and
  worth keeping separately: it means the version files were bumped by
  hand or by a publish that then failed partway. azure was in exactly
  this state, committed 1.2.3 against a released 1.2.2.

  PUBLISHED BUT NOT ADOPTED (released > pin). Someone published an SDK
  and did not add it to versions[]. Readers keep getting the older one.
  Adding a version here is deliberate, a one-line change made in review,
  and that is the right design: this exists to say WHEN there is one to
  add, not to add it automatically.

  A PIN THAT CANNOT BE FETCHED (pin > released). Louder than either: the
  build will fail, or worse, serve a version that was yanked.

  A LISTED VERSION WITH NO RELEASE. versions[] is a list, not a single
  pin, and every entry in it is fetched at build time. An older entry
  whose release was deleted breaks the build just as surely as the
  newest one, and checking only the newest would miss it.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

CONFIG = Path(__file__).resolve().parent.parent / "config" / "providers.json"


def api(url: str):
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    if tok := os.environ.get("GITHUB_TOKEN"):
        req.add_header("Authorization", f"Bearer {tok}")
    return json.load(urllib.request.urlopen(req, timeout=30))


def semver(v: str) -> tuple[int, ...]:
    return tuple(int(p) for p in re.findall(r"\d+", v.lstrip("v")))


def committed_version(repo: str) -> str:
    """The version ubx-sdk-<p>'s own main claims.

    Read from sdk/typescript/package.json, which is the same file that
    repo's publish.yml treats as version truth (it cross-checks it
    against sdk/python/pyproject.toml and refuses to publish when the
    two disagree, so reading either one here is equivalent).
    """
    blob = api(f"https://api.github.com/repos/{repo}/contents/sdk/typescript/package.json")
    return json.loads(base64.b64decode(blob["content"]))["version"]


def go_tree(repo: str, ref: str) -> str | None:
    """The hash of sdk/go's whole tree at one ref, or None if absent.

    A tree hash is a content hash, so equal hashes mean byte-identical
    trees and there is nothing to diff file by file. That matters at
    this scale: azure's own regeneration touched so many files that the
    compare API truncates its file list outright, and a check built on
    that list would silently see nothing for the largest provider, which
    is the one most worth watching.
    """
    try:
        return api(f"https://api.github.com/repos/{repo}/git/trees/{ref}:sdk/go")["sha"]
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise


def releases(repo: str) -> set[str]:
    """Every bare vX.Y.Z release tag on the repo.

    Bare tags only. Each of these repos also carries sdk/go/vX.Y.Z tags
    for the Go module, which are a different thing entirely: the Go
    module tag is the Go "publish" step, while the bare tag is the docs
    release carrying docs.tar.gz, and only the latter is fetchable here.
    Matching loosely would let a Go tag stand in for a docs release that
    was never created, which is precisely the state this guards against.
    """
    out = set()
    url = f"https://api.github.com/repos/{repo}/releases?per_page=100"
    while url:
        req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
        if tok := os.environ.get("GITHUB_TOKEN"):
            req.add_header("Authorization", f"Bearer {tok}")
        resp = urllib.request.urlopen(req, timeout=30)
        for r in json.load(resp):
            if re.fullmatch(r"v\d+\.\d+\.\d+", r["tag_name"]):
                out.add(r["tag_name"].lstrip("v"))
        link = resp.headers.get("Link", "")
        nxt = re.search(r'<([^>]+)>;\s*rel="next"', link)
        url = nxt.group(1) if nxt else None
    return out


def main() -> int:
    config = json.loads(CONFIG.read_text())
    providers = config.get("providers", {})
    if not providers:
        # Never pass by finding nothing: a config that parsed to zero
        # providers means the format moved, not that all is well. The
        # same guard the schema-side check carries, for the same reason.
        print(f"no providers found in {CONFIG}", file=sys.stderr)
        return 1

    problems: list[str] = []
    rows: list[str] = []

    for name, entry in sorted(providers.items()):
        repo = entry["repo"]
        versions = entry.get("versions") or []
        if not versions:
            problems.append(f"{name}: no versions listed at all")
            continue
        pin = versions[-1]

        try:
            committed = committed_version(repo)
        except Exception as err:  # noqa: BLE001
            print(f"  {name:<14} could not read the committed version ({err})", file=sys.stderr)
            continue
        try:
            published = releases(repo)
        except urllib.error.HTTPError as err:
            print(f"  {name:<14} could not read releases ({err})", file=sys.stderr)
            continue

        latest = max(published, key=semver) if published else None
        rows.append(
            f"  {name:<14} committed={committed:<10} "
            f"released={latest or 'none':<10} pin={pin}"
        )

        if latest is None:
            problems.append(f"{name}: committed {committed} but nothing is released at all")
            continue

        # The primary check. See the module docstring for why this is a
        # tree comparison and not a version comparison.
        try:
            at_tag = go_tree(repo, f"v{latest}")
            at_main = go_tree(repo, "main")
        except Exception as err:  # noqa: BLE001
            print(f"  {name:<14} could not compare sdk/go trees ({err})", file=sys.stderr)
            at_tag = at_main = None
        if at_tag and at_main and at_tag != at_main:
            problems.append(
                f"{name}: sdk/go on main differs from what v{latest} published "
                f"-- merged but never published, so this site cannot fetch it"
            )

        if semver(committed) > semver(latest):
            problems.append(
                f"{name}: committed {committed} is newer than released {latest} "
                f"-- the version files claim a release that does not exist"
            )
        if semver(latest) > semver(pin):
            problems.append(
                f"{name}: released {latest} is newer than the pin {pin} "
                f"-- published but not adopted, so readers still get {pin}"
            )
        if semver(pin) > semver(latest):
            problems.append(
                f"{name}: pin {pin} is newer than released {latest} "
                f"-- the pin names a release that does not exist"
            )

        # Every listed version is fetched at build time, not just the
        # newest, so a hole anywhere in the list is a broken build.
        for v in versions:
            if v not in published:
                problems.append(
                    f"{name}: versions[] lists {v}, which has no release on {repo}"
                )

    print("\n".join(rows))
    if not problems:
        print(f"\nok: all {len(providers)} SDK pins agree with what is committed and released")
        return 0

    print(f"\n{len(problems)} problem(s):", file=sys.stderr)
    for p in problems:
        print(f"  {p}", file=sys.stderr)
    print(
        "\nMerging an SDK regeneration is not publishing it: dispatch the SDK repo's\n"
        "publish.yml, then add the new version to config/providers.json here. Both\n"
        "steps, every time. A green build proves neither.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
