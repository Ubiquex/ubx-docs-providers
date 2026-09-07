// Fails the build if any compressible exported file is large enough that
// CloudFront will refuse to compress it.
//
// WHY THIS EXISTS. CloudFront compresses objects up to 10,000,000 bytes
// and silently declines above that. There is no error, no warning, and
// nothing in the response says "too big to compress": it simply arrives
// without a content-encoding header. The only way to notice is to compare
// one page's response headers against another's.
//
// Three pages on this site were over the ceiling and shipped completely
// uncompressed for months (UBI-243). The worst served 11,506,319 bytes to
// every reader while its neighbours served brotli. Nothing surfaced it.
// It was found only by measuring headers by hand while investigating
// something else, and the fix that resolved it, a markup reduction, was
// not even aimed at compression: it happened to drop the page under the
// ceiling, which turned an 11.5MB transfer into 432KB.
//
// So the failure mode is a 20x transfer regression that looks exactly
// like normal operation. That is what this guards.
//
// THE LIMIT IS DELIBERATELY BELOW THE REAL CEILING. Failing at
// 10,000,000 would mean failing at the moment readers are already being
// served uncompressed. Failing at 9,000,000 leaves a megabyte of slack:
// the build breaks while every page is still being compressed, and there
// is room to fix it before anyone is affected.
//
// COMPRESSIBLE TYPES ONLY. CloudFront never compresses an image or a
// font, and there is nothing to lose when it declines on one, so a large
// binary asset is not a defect and must not fail the build.

import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// CloudFront's documented ceiling. Named rather than inlined so the
// margin below it is visibly a choice rather than a magic number.
const CLOUDFRONT_CEILING = 10_000_000;
const LIMIT = 9_000_000;

// What CloudFront will compress if it can, which is what has something
// to lose by going over. Deliberately a list rather than "not an image":
// a new binary type should not silently start failing builds.
const COMPRESSIBLE = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".json", ".txt",
  ".svg", ".xml", ".map", ".webmanifest", ".rss", ".atom",
]);

const root = process.argv[2] ?? "out";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(root);
} catch (err) {
  console.error(`cannot read the export at ${root}: ${err.message}`);
  console.error("run the build first, or pass the export directory as an argument");
  process.exit(1);
}

const compressible = files.filter((f) => COMPRESSIBLE.has(extname(f).toLowerCase()));
if (compressible.length === 0) {
  // Never pass by finding nothing. An export with no compressible files
  // at all means the build produced nothing, or this script is pointed at
  // the wrong directory, and either way a green check would be a lie.
  console.error(`no compressible files found under ${root}/ -- this check would pass vacuously`);
  process.exit(1);
}

const sized = compressible
  .map((f) => ({ f, size: statSync(f).size }))
  .sort((a, b) => b.size - a.size);

const over = sized.filter((x) => x.size > LIMIT);
const mb = (n) => `${(n / 1_048_576).toFixed(2)} MB`;

if (over.length > 0) {
  console.error(
    `${over.length} exported file(s) exceed ${LIMIT.toLocaleString()} bytes.\n` +
      `CloudFront does not compress above ${CLOUDFRONT_CEILING.toLocaleString()} bytes, and gives no\n` +
      `warning when it declines: the file would ship uncompressed to every reader.\n`,
  );
  for (const { f, size } of over) {
    console.error(`  ${mb(size).padStart(9)}  ${size.toLocaleString().padStart(12)} bytes  ${f}`);
  }
  console.error(
    `\nReduce the page rather than raising the limit. On this site the fix was\n` +
      `per-row markup: repeated class strings and an inlined SVG accounted for\n` +
      `2.5MB of an 11MB page, at no cost to what a reader sees.`,
  );
  process.exit(1);
}

// Byte figures, not MB, in both the limit and the largest file. The two
// units differ by 5% at this scale (9,000,000 bytes is 8.58 MB), and a
// message that says "under the 8.58 MB limit" invites someone to compare
// it against a 9MB file and conclude the check is wrong.
console.log(
  `ok: ${compressible.length.toLocaleString()} compressible files. Largest is ` +
    `${sized[0].size.toLocaleString()} bytes (${mb(sized[0].size)}), ${sized[0].f}. ` +
    `Limit ${LIMIT.toLocaleString()} bytes, CloudFront ceiling ` +
    `${CLOUDFRONT_CEILING.toLocaleString()}. All compressible.`,
);
