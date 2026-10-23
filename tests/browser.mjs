import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const root = process.env.PREVIEW_URL || "http://127.0.0.1:5173";
const output = "docs/previews";
mkdirSync(output, { recursive: true });
let checks = [];
const check = (s) => {
  checks.push(s);
  console.log(s);
};
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  for (
    let y = 0;
    y < (await page.evaluate(() => document.body.scrollHeight));
    y += 650
  ) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(110);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  assert.equal(overflow, false, "Horizontal overflow at " + name);
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(root);
  await page
    .getByRole("heading", { name: "شغفك بالتجارة. إله مساحة أكبر." })
    .waitFor();
  await capture(page, "marketing-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "marketing-mobile");
  check("Marketing desktop/mobile; no horizontal overflow");
  const slug = "browser-" + Date.now().toString(36);
  await page.goto(root + "/register");
  await page.getByLabel("اسمك", { exact: true }).fill("تاجر المتصفح");
  await page
    .getByLabel("اسم المتجر", { exact: true })
    .fill("متجر اختبار المتصفح");
  await page.locator("input[name=slug]").fill(slug);
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill(slug + "@example.test");
  await page.locator("input[name=password]").fill("Browser-test-2026!");
  await page.getByRole("button", { name: "أنشئ متجري" }).click();
  await page.waitForURL("**/app");
  await page.getByRole("heading", { name: "يا هلا، تاجر." }).waitFor();
  check("Registration, session and protected merchant route");
  await page.goto(root + "/app/products");
  await page.getByRole("button", { name: "أضف منتج", exact: true }).click();
  await page
    .getByLabel("اسم المنتج", { exact: true })
    .fill("قميص اختبار المتصفح");
  await page
    .getByLabel("الوصف", { exact: true })
    .fill("منتج محلي لاختبار دورة الشراء");
  await page.getByLabel("السعر — د.ع", { exact: true }).fill("35000");
  await page.getByLabel("المقاس", { exact: true }).fill("M");
  await page.getByLabel("اللون", { exact: true }).fill("عاجي");
  await page.getByLabel("المخزون", { exact: true }).fill("6");
  await page
    .locator("input[type=file]")
    .setInputFiles("public/demo/linen-shirt.webp");
  await page.waitForResponse(
    (r) => r.url().endsWith("/api/images") && r.status() === 201,
  );
  await page.getByRole("button", { name: "حفظ المنتج" }).click();
  await page.getByText("منتجك الجديد جاهز بالمتجر", { exact: true }).waitFor();
  check("Merchant creates a product with image and variant via UI");
  const guest = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    }),
    customer = await guest.newPage();
  customer.on("pageerror", (e) => errors.push(e.message));
  await customer.goto(root + "/s/" + slug);
  await customer
    .getByRole("heading", { name: "قميص اختبار المتصفح", exact: true })
    .click();
  await customer
    .getByRole("button", { name: "أضف للسلة", exact: true })
    .click();
  await customer.getByRole("link", { name: "شوف سلتك" }).click();
  await customer.getByRole("link", { name: "نكمل الطلب" }).click();
  await customer
    .getByLabel("الاسم الكامل", { exact: true })
    .fill("زبون اختبار متصفح");
  await customer.locator("input[name=phone]").fill("07701234567");
  await customer.getByLabel("المنطقة", { exact: true }).fill("الكرادة");
  await customer
    .getByLabel("العنوان بالتفصيل", { exact: true })
    .fill("عنوان اختبار محلي، دار ٥");
  await customer.locator("input[type=checkbox]").check();
  await customer.getByRole("button", { name: /تأكيد الطلب/ }).click();
  await customer.waitForURL("**/receipt/**");
  await customer.getByRole("heading", { name: "وصلنا طلبك." }).waitFor();
  check("Guest cart/checkout/COD confirmation without account");
  await capture(customer, "receipt-mobile");
  await page.goto(root + "/app/orders");
  await page.getByRole("cell", { name: /زبون اختبار متصفح/ }).waitFor();
  await page
    .getByRole("button", { name: /فتح الطلب/ })
    .first()
    .click();
  await page.getByRole("button", { name: "تحديث إلى مؤكد" }).click();
  await page.getByRole("button", { name: "تحديث إلى قيد التجهيز" }).waitFor();
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  check("Merchant receives real order and changes status");
  await page.goto(root + "/app/subscription");
  await page
    .getByRole("button", { name: "طلب التفعيل", exact: true })
    .first()
    .click();
  await page
    .getByText("طلب اشتراكك قيد المراجعة. الباقة لا تتغير قبل التفعيل اليدوي.")
    .waitFor();
  check("Plan request persists without fake payment or entitlement grant");
  await context.close();
  await guest.close();
  const demo = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
  });
  demo.setDefaultTimeout(20000);
  const d = await demo.newPage();
  await d.goto(root + "/login");
  await d
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("demo@riwaq.test");
  await d.locator("input[name=password]").fill("Local-demo-2026!");
  await d.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await d.waitForURL("**/app");
  await d.getByText("شغلك الحلو،", { exact: false }).waitFor();
  await capture(d, "merchant-desktop");
  await d.setViewportSize({ width: 390, height: 844 });
  await capture(d, "merchant-mobile");
  await d.getByRole("button", { name: "تفعيل الوضع الداكن" }).click();
  await capture(d, "merchant-mobile-dark");
  await d.getByRole("button", { name: "تفعيل الوضع الفاتح" }).click();
  await d.goto(root + "/s/dar-demo");
  await d
    .getByRole("heading", { name: "تفاصيل تحبّها. واختيارات تشبهك." })
    .waitFor();
  await capture(d, "store-mobile");
  await d.setViewportSize({ width: 1440, height: 1050 });
  await capture(d, "store-desktop");
  await demo.close();
  assert.deepEqual(errors, []);
  check(
    "Light/dark, RTL, reduced motion, screenshots at 390 and 1440, zero page errors",
  );
  writeFileSync(
    "docs/browser-verification.json",
    JSON.stringify(
      { checks, date: new Date().toISOString(), screenshots: output },
      null,
      2,
    ),
  );
  console.log(checks.join("\n"));
} finally {
  await browser.close();
}
