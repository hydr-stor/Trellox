# Security decisions and production boundary

Threats considered: cross-tenant IDOR, stolen/forged sessions, CSRF, stock races, replayed checkout, manipulated price, self-granted plans, upload XSS, brute-force auth and accidental writes to existing infrastructure.

Controls implemented: server-derived tenant scope; parameterized SQL; scrypt salted hashes; token hashes with expiry; same-origin mutations; schema validation and bounded bodies; SQL transactional stock reservation and cancellation triggers; payload-bound idempotency; server subscription and readiness gates; explicit image types; shared D1 auth rate limiter; no remote IDs, credentials or real deploy script.

PII: merchant name/email for accounts; customer name/phone/governorate/area/address/note only for fulfillment. No PII in audit events, public receipt or browser storage. Receipt links are bearer secrets, 256 bits, no-referrer and no-store. Order history tracks statuses; audit tracks IDs/actions only. Local fixture PII is explicitly fictional. Checkout body fingerprint is SHA256; browser retains only fingerprint/idempotency key. Cart storage only has variant IDs and quantities.

Not a production compliance claim. Orders currently retain fulfillment data until future retention tooling is implemented. Customer export/erasure, retention jobs, verification/recovery, abuse protection, provider data agreements and restore drills remain launch blockers (see phase-two). Auth attempts are removed opportunistically on login/register; expired sessions removed on login. Add scheduled expiry cleanup before launch. KDF costs must be benchmarked in the intended paid Worker plan; local CPU proof is not an edge load test. Prefix magic checks protect MIME selection but are not full image decoding. Catalog text is React-escaped; no HTML injection.

Dependency installation scripts are disabled in .npmrc and CI. Exact installed versions are locked in package-lock.json. Production dependency audit passed with zero known advisories at verification time; audits do not prove the absence of vulnerabilities.

Dependency maintenance: the direct stable Miniflare 4.20260730.0 test tool is pinned with scoped transitive overrides to sharp 0.35.5 and undici 7.29.1, fixing known advisories without replacing the test runtime with a prerelease major. The full API suite passed after this change; final full audit is zero. Review these overrides on the next Miniflare upgrade.
