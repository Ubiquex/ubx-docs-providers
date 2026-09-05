// Tests for infra/cloudfront/rewrite.js, the CloudFront viewer-request
// function that maps clean URLs onto the files Next's static export
// actually writes.
//
// These run in plain node with no AWS call and no credentials, so they
// gate every PR rather than only whoever remembers to run
// `aws cloudfront test-function` by hand. The deployed function is a
// CloudFront Function (cloudfront-js-2.0), which is ES5-shaped and
// declares a bare `handler` with no export, so it is loaded by reading
// the real source file and evaluating it. That is deliberate: the thing
// under test is the exact byte content that gets uploaded, not a
// re-typed copy that could drift from it.
//
// WHY THE CASE LIST IS THIS LONG. The first version of this function
// shipped with eight cases and a real bug that all eight missed: it
// decided "this path has a file extension" by asking whether the last
// segment contained a dot. Every version landing page (/github/1.2.3,
// /aws/2.2.1) has a dot in its last segment, so all of them were left
// unrewritten and 404'd in production while their own child pages
// served fine. The eight cases included /aws/2.2.1/ WITH a trailing
// slash, which takes a different branch and passed, and a deep path
// whose last segment had no dot, which also passed. The bare version
// path was never tested. It is the first case below now.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "rewrite.js"), "utf8");
const handler = new Function(`${source}; return handler;`)();

function rewrite(uri) {
  const event = {
    version: "1.0",
    context: { eventType: "viewer-request" },
    viewer: { ip: "1.2.3.4" },
    request: { method: "GET", uri, headers: {}, cookies: {}, querystring: {} },
  };
  return handler(event).uri;
}

// Each case is [input, expected, why it is here]. The twelve below are the
// exact set run against the real deployed function via
// `aws cloudfront test-function` before it was published.
const CASES = [
  // The regression that shipped broken. A dot in the last segment is a
  // version number here, not an extension.
  ["/github/1.2.3", "/github/1.2.3.html", "version landing page, bare"],
  ["/aws/2.2.1", "/aws/2.2.1.html", "version landing page, second provider"],

  // Roots and provider pages.
  ["/", "/index.html", "site root is the one real index.html"],
  ["/github", "/github.html", "provider page"],
  ["/404", "/404.html", "error page is reachable as a normal route"],

  // Trailing slash takes its own branch and must land on the same file
  // as the bare form.
  ["/github/1.2.3/", "/github/1.2.3.html", "trailing slash, same target as bare"],

  // A deep, genuinely extensionless resource page.
  [
    "/github/1.2.3/data/build/build",
    "/github/1.2.3/data/build/build.html",
    "deep resource page",
  ],

  // Everything below is a real file already in the bucket and must pass
  // through untouched. Rewriting any of these would break the site.
  [
    "/github/1.2.3/data/build/build.txt",
    "/github/1.2.3/data/build/build.txt",
    "RSC navigation payload, fetched during soft navigation",
  ],
  [
    "/_next/static/chunks/abc.js",
    "/_next/static/chunks/abc.js",
    "content-hashed asset",
  ],
  ["/search-index.json", "/search-index.json", "prebuilt search index"],
  [
    "/sidebar/github/1.2.3.json",
    "/sidebar/github/1.2.3.json",
    "sidebar tree, dot in the filename AND a real extension",
  ],
  ["/logos/aws.svg", "/logos/aws.svg", "static image"],
];

for (const [uri, expected, why] of CASES) {
  test(`${uri} -> ${expected}  (${why})`, () => {
    assert.equal(rewrite(uri), expected);
  });
}

// Guards on the shape of the rule itself, rather than on one more path.
test("no path is ever rewritten twice into .html.html", () => {
  for (const [, expected] of CASES) {
    assert.equal(rewrite(expected), expected, `${expected} must be stable`);
  }
});

test("every extension the deployed bucket really contains passes through", () => {
  // Derived by listing the real bucket, not guessed:
  // .txt .html .json .js .css .svg .png
  for (const ext of ["txt", "html", "json", "js", "css", "svg", "png"]) {
    const uri = `/some/path/file.${ext}`;
    assert.equal(rewrite(uri), uri, `.${ext} must pass through untouched`);
  }
});
