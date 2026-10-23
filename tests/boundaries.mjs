import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(15000);
  const p = await context.newPage();
  const root = process.env.PREVIEW_URL || "http://127.0.0.1:5173";
  for (const [width, height] of [
    [320, 740],
    [375, 812],
    [844, 390],
  ]) {
    await p.setViewportSize({ width, height });
    for (const path of ["/", "/register", "/s/dar-demo"]) {
      await p.goto(root + path);
      await p.locator("h1").waitFor();
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `Overflow ${path} ${width}`,
      );
    }
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(root + "/login");
  await p
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("demo@riwaq.test");
  await p.locator("input[name=password]").fill("Local-demo-2026!");
  await p.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await p.waitForURL("**/app");
  await p.getByRole("button", { name: "فتح القائمة", exact: true }).click();
  await p
    .locator("aside.sidebar")
    .getByRole("button", { name: "إغلاق القائمة", exact: true })
    .waitFor();
  await p.keyboard.press("Escape");
  assert.equal(await p.locator("aside.sidebar").getAttribute("inert"), "");
  for (const [width, height] of [
    [320, 740],
    [375, 812],
    [844, 390],
  ]) {
    await p.setViewportSize({ width, height });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Merchant overflow ${width}`,
    );
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(root + "/app/products");
  await p.getByRole("button", { name: "أضف منتج", exact: true }).click();
  assert.equal(await p.locator("dialog").evaluate((el) => el.open), true);
  await p.keyboard.press("Escape");
  assert.equal(await p.locator("dialog").count(), 0);
  const report = JSON.parse(
    readFileSync("docs/browser-verification.json", "utf8"),
  );
  report.checks.push(
    "320/375px and landscape overflow checks; sidebar Escape/inert and native dialog Escape verified",
  );
  report.boundaryWidths = [320, 375, 390, 844, 1440];
  writeFileSync(
    "docs/browser-verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log("Boundary widths and keyboard checks passed");
} finally {
  await browser.close();
}
