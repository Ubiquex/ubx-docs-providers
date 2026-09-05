# infra

Infrastructure for the deployed site that is not expressible as
application code. Everything here is **live in production**, in AWS
account `839333509514`, us-east-1.

This directory exists because it did not, and that was a real problem.
The CloudFront Function below was created directly with the AWS CLI and
lived only in AWS. It shipped with a bug that 404'd every version
landing page in production, and because the source existed in no
repository the bug was never reviewable, never tested, and the fix was
not version controlled either.

## What is deployed

| Resource | Identifier |
|---|---|
| S3 bucket | `ubx-docs-providers-site` |
| Origin Access Control | `E2RTABMTDPMYXY` |
| CloudFront distribution | `E3KJKVZQPGON0W` |
| CloudFront Function | `ubx-docs-providers-rewrite` |
| ACM certificate (us-east-1) | `2fd935a5-b2d0-46ac-bd91-c496d8674328` |
| IAM deploy role | `ubx-docs-providers-deploy` |

The bucket blocks all public access and is readable only by this one
distribution, via a bucket policy conditioned on the distribution ARN.
It is not an S3 website endpoint, which is what makes Origin Access
Control usable at all.

## cloudfront/rewrite.js

A viewer-request function that maps clean URLs onto the files Next's
static export actually writes.

The key fact it encodes: `output: "export"` with the default
`trailingSlash: false` emits `<route>.html`, **not**
`<route>/index.html`. Only the site root is `index.html`. A function
written the other way round 404s the whole site except the landing
page.

The second key fact, learned the hard way: "does the last path segment
contain a dot" is **not** a usable test for "is this a file". Every
version landing page on this site (`/github/1.2.3`, `/aws/2.2.1`) has a
dot in its last segment. The function matches a known extension list
instead, derived from what the real deployed bucket contains.

### Running the tests

```
node --test infra/cloudfront/rewrite.test.mjs
```

No AWS call and no credentials. The tests read `rewrite.js` itself and
evaluate it, so what is tested is the exact byte content that gets
uploaded rather than a re-typed copy that could drift. They run in CI on
every PR.

### Updating the deployed function

The repo is the source of truth. Edit `cloudfront/rewrite.js`, make the
tests pass, get the PR merged, then:

```
ETAG=$(aws cloudfront describe-function --name ubx-docs-providers-rewrite --query ETag --output text)

aws cloudfront update-function \
  --name ubx-docs-providers-rewrite --if-match "$ETAG" \
  --function-config Comment="Append .html for extensionless routes (Next static export)",Runtime=cloudfront-js-2.0 \
  --function-code fileb://infra/cloudfront/rewrite.js

# re-read the ETag, it changes on update
ETAG=$(aws cloudfront describe-function --name ubx-docs-providers-rewrite --query ETag --output text)
aws cloudfront publish-function --name ubx-docs-providers-rewrite --if-match "$ETAG"

# a function change affects every cached path, so this is the one case
# that genuinely warrants the wildcard
aws cloudfront create-invalidation --distribution-id E3KJKVZQPGON0W --paths '/*'
```

Confirm the deployed copy still matches the repo:

```
aws cloudfront get-function --name ubx-docs-providers-rewrite --stage LIVE /tmp/live.js
diff /tmp/live.js infra/cloudfront/rewrite.js
```

That diff is currently clean, and a drift check in CI would be a
reasonable next step. See the PR that added this directory for why
publishing from the deploy workflow was considered and not done.

## Notes that are easy to lose

**The IAM trust policy uses GitHub's immutable subject claims.** This
org has them enabled, so the OIDC `sub` is
`repo:Ubiquex@232584184/ubx-docs-providers@1354048073:ref:refs/heads/main`,
carrying numeric org and repo IDs, not the
`repo:Ubiquex/ubx-docs-providers:...` form every AWS and GitHub doc
shows. The documented pattern does not match and fails with
`Not authorized to perform sts:AssumeRoleWithWebIdentity`. The ID form
is matched deliberately rather than accepting both, because accepting
the plain form gives back exactly the rename protection the feature
exists to provide.

**DNS is at name.com, not Route53.** There is no hosted zone in this
account. Both the ACM validation record and the
`providers.ubiquex.io -> d2mz0ooyz0n4iz.cloudfront.net` CNAME are
manual.
