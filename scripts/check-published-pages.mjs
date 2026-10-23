import assert from "node:assert/strict";
const url = process.env.PAGES_URL;
assert.ok(
  url?.startsWith("https://"),
  "PAGES_URL must be the deployed HTTPS preview URL.",
);
let failure;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    assert.equal(
      response.status,
      200,
      "Published page did not return HTTP 200.",
    );
    const html = await response.text();
    assert.ok(
      html.includes('content="pages-preview"'),
      "The published entry is still the raw source or an older build.",
    );
    assert.ok(
      !html.includes("/src/main.tsx"),
      "Raw TypeScript must never be published.",
    );
    const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
      (m) => new URL(m[1], url),
    );
    assert.ok(
      refs.length >= 2,
      "Expected a built JavaScript entry and stylesheet.",
    );
    for (const ref of refs) {
      assert.equal(ref.origin, new URL(url).origin);
      const asset = await fetch(ref, { cache: "no-store" });
      assert.equal(asset.status, 200, `Missing asset: ${ref.pathname}`);
      assert.ok(
        !asset.headers.get("content-type")?.includes("text/html"),
        "Asset URL unexpectedly returned HTML.",
      );
    }
    console.log("Verified published Pages preview and its JS/CSS assets:", url);
    process.exit(0);
  } catch (error) {
    failure = error;
    if (attempt < 5) await new Promise((r) => setTimeout(r, 5000));
  }
}
throw failure;
