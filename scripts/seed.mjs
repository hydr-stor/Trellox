import { readFile } from "node:fs/promises";
const base = "http://127.0.0.1:8787";
const health = await fetch(base + "/api/health").then((r) => r.json());
if (health.environment !== "local") throw new Error("Seed is local-only.");
let cookie = "";
const request = async (path, method = "GET", data) => {
  const form = data instanceof FormData;
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(!form && data ? { "Content-Type": "application/json" } : {}),
    },
    ...(data ? { body: form ? data : JSON.stringify(data) } : {}),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  const json = await r.json();
  if (!r.ok) throw new Error(json.error);
  return json;
};
const account = {
  name: "نور",
  email: "demo@riwaq.test",
  password: "Local-demo-2026!",
  storeName: "دار — متجر تجريبي",
  slug: "dar-demo",
};
try {
  await request("/auth/register", "POST", account);
} catch (e) {
  await request("/auth/login", "POST", {
    email: account.email,
    password: account.password,
  });
}
const existing = await request("/merchant/products");
if (existing.length) {
  console.log("Local demo already exists: /s/dar-demo");
  process.exit(0);
}
await request("/merchant/store", "PATCH", {
  name: account.storeName,
  description:
    "كتّان طبيعي، تفاصيل هادئة، وقطع تبقى وياك. هذا متجر اختبار محلي؛ المنتجات والصورة والطلبات أمثلة للتجربة فقط.",
  return_policy:
    "بيانات تجريبية: الاستبدال خلال ٣ أيام إذا كانت القطعة بحالتها الأصلية. تواصل مع المتجر قبل إرجاع أي منتج.",
  logo: null,
});
const categories = await request("/merchant/categories");
const category =
  categories.find((c) => c.name === "الكتّان اليومي") ||
  (await request("/merchant/categories", "POST", { name: "الكتّان اليومي" }));
const form = new FormData();
form.append(
  "file",
  new Blob([await readFile("public/demo/linen-shirt.webp")], {
    type: "image/webp",
  }),
  "linen-shirt.webp",
);
const image = await request("/images", "POST", form);
const product = await request("/merchant/products", "POST", {
  title: "قميص كتّان — عاجي طبيعي",
  description:
    "كتّان بملمس ناعم، قصّة مريحة وأزرار بلون طبيعي. منتج وصورة مولّدة للتجربة المحلية فقط، وليس عرضًا تجاريًا حقيقيًا.",
  price: 45000,
  compare_price: 55000,
  category_id: category.id,
  image: image.url,
  variants: [
    { size: "S", color: "عاجي", stock: 12 },
    { size: "M", color: "عاجي", stock: 18 },
    { size: "L", color: "عاجي", stock: 8 },
    { size: "XL", color: "عاجي", stock: 3 },
  ],
});
await request("/merchant/products", "POST", {
  title: "قميص كتّان — إصدار خفيف",
  description: "مثال محلي لاختبار الخيارات والمخزون. الصورة توضيحية ومولّدة.",
  price: 39000,
  category_id: category.id,
  image: image.url,
  variants: [
    { size: "M", color: "طبيعي", stock: 7 },
    { size: "L", color: "طبيعي", stock: 2 },
  ],
});
await request("/merchant/zones", "POST", { governorate: "البصرة", fee: 7000 });
await request("/merchant/zones", "POST", { governorate: "أربيل", fee: 8000 });
const shop = await request("/shops/dar-demo"),
  variant = shop.products.find((p) => p.id === product.id).variants[0].id;
for (const [name, status] of [
  ["زبون اختبار محلي ١", "delivered"],
  ["زبون اختبار محلي ٢", "preparing"],
  ["زبون اختبار محلي ٣", "new"],
]) {
  const result = await request("/shops/dar-demo/orders", "POST", {
    idempotency_key: crypto.randomUUID(),
    customer_name: name,
    phone: "07700000000",
    governorate: "بغداد",
    area: "منطقة اختبار",
    address: "عنوان محلي تجريبي، ليس عنوان زبون حقيقي",
    note: "طلب اختبار محلي فقط",
    items: [{ variant_id: variant, quantity: 1 }],
  });
  const receipt = await request(
    "/shops/dar-demo/receipts/" + result.receipt_token,
  );
  for (const step of status === "delivered"
    ? ["confirmed", "preparing", "shipped", "delivered"]
    : status === "preparing"
      ? ["confirmed", "preparing"]
      : [])
    await request(`/merchant/orders/${receipt.id}/status`, "PATCH", {
      status: step,
    });
}
console.log("Local demo ready. Login: demo@riwaq.test / Local-demo-2026!");
console.log("Store: http://localhost:5173/s/dar-demo");
