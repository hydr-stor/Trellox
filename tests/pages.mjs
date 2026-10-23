import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
const root = resolve("dist/pages");
assert.ok(
  existsSync(resolve(root, "index.html")),
  "Build the Pages preview before testing it.",
);
const html = readFileSync(resolve(root, "index.html"), "utf8");
assert.ok(
  !html.includes("/src/main.tsx"),
  "Pages must receive compiled JavaScript.",
);
assert.ok(
  html.includes("/Trellox/assets/"),
  "Asset URLs must include the project base path.",
);
const requests = [];
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  requests.push(pathname);
  if (!pathname.startsWith("/Trellox/")) {
    res.writeHead(404).end();
    return;
  }
  const path = resolve(
    root,
    pathname.slice("/Trellox/".length) || "index.html",
  );
  if (!path.startsWith(root + "/") || !existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".woff2": "font/woff2",
  };
  res.writeHead(200, {
    "Content-Type": types[extname(path)] || "application/octet-stream",
  });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = `http://127.0.0.1:${server.address().port}/Trellox/`;
  await page.goto(url);
  await page
    .getByRole("heading", { name: "شغفك بالتجارة. إله مساحة أكبر." })
    .waitFor();
  await page
    .getByRole("link", { name: "ابدأ متجرك", exact: false })
    .first()
    .click();
  await page.getByRole("heading", { name: "هذه معاينة للواجهات." }).waitFor();
  assert.equal(
    await page.locator("input[type=password]").count(),
    0,
    "Static hosting must not present a working login form.",
  );
  await page.getByRole("link", { name: "معاينة لوحة التاجر" }).click();
  await page.getByRole("heading", { name: "مساحة التاجر، عن قرب." }).waitFor();
  await page.locator(".pages-screen img").waitFor();
  assert.ok(
    await page
      .locator(".pages-screen img")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  await page.reload();
  await page.getByRole("heading", { name: "مساحة التاجر، عن قرب." }).waitFor();
  await page.getByRole("link", { name: "معاينة متجر الزبون" }).click();
  await page.getByRole("heading", { name: "من عين زبونك." }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "من عين زبونك." }).waitFor();
  assert.deepEqual(errors, []);
  assert.ok(
    !requests.some((p) => p.includes("/api/")),
    "Pages preview must never call a missing backend.",
  );
  console.log(
    "Pages: compiled entry, /Trellox/ assets, marketing, honest auth boundary, preview images, hash-route reloads and zero API calls passed.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
