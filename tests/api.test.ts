import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
let mf: Miniflare, db: D1Database;
let cookie = "",
  other = "",
  storeId = "",
  variant = "",
  productId = "",
  receipt = "",
  orderId = "";
const origin = "http://localhost:8787";
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  session = cookie,
) {
  const r = await mf.dispatchFetch(origin + "/api" + path, {
    method,
    headers: {
      "content-type": "application/json",
      origin,
      ...(session ? { cookie: session } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const json = (await r.json()) as any;
  return {
    status: r.status,
    json,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const registration = (slug: string) => ({
  name: "تاجر تجريبي",
  email: slug + "@example.test",
  password: "Test-password-2026!",
  storeName: "متجر الاختبار",
  slug,
});
const checkout = (key = crypto.randomUUID()) => ({
  idempotency_key: key,
  customer_name: "زبون محلي",
  phone: "07701234567",
  governorate: "بغداد",
  area: "الكرادة",
  address: "شارع الاختبار، دار ١٢",
  note: "",
  items: [{ variant_id: variant, quantity: 1 }],
});
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: ".test-worker/index.js",
    compatibilityDate: "2026-07-01",
    d1Databases: ["DB"],
    r2Buckets: ["IMAGES"],
    bindings: { APP_ENV: "local" },
  });
  db = (await mf.getD1Database("DB")) as unknown as D1Database;
  for (const sql of readFileSync(
    "migrations/0001_foundation.sql",
    "utf8",
  ).split("-- statement"))
    if (sql.trim()) await db.prepare(sql.trim()).run();
});
afterAll(async () => {
  await mf?.dispose();
});
describe.sequential("real Worker + D1 commerce boundary", () => {
  it("rejects unauthenticated and cross-origin mutations", async () => {
    expect((await request("/auth/me", "GET", undefined, "")).status).toBe(401);
    const r = await mf.dispatchFetch(origin + "/api/auth/register", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify(registration("evil")),
    });
    expect(r.status).toBe(403);
  });
  it("registers atomically with HttpOnly session and safe profile", async () => {
    const r = await request(
      "/auth/register",
      "POST",
      registration("tenant-a"),
      "",
    );
    expect(r.status).toBe(201);
    cookie = r.cookie!;
    const me = await request("/auth/me");
    expect(me.json.user.password_hash).toBeUndefined();
    expect(me.json.subscription.status).toBe("trial");
    expect(me.json.capabilities.products).toBe(30);
    storeId = me.json.store.id;
    const dbUser = await db
      .prepare("SELECT password_hash FROM users LIMIT 1")
      .first<any>();
    expect(dbUser.password_hash).not.toContain(
      registration("tenant-a").password,
    );
  });
  it("rejects wrong credentials and logs in with correct password", async () => {
    expect(
      (
        await request(
          "/auth/login",
          "POST",
          { email: "tenant-a@example.test", password: "wrong-password-2026!" },
          "",
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await request(
          "/auth/login",
          "POST",
          { email: "tenant-a@example.test", password: "Test-password-2026!" },
          "",
        )
      ).status,
    ).toBe(200);
  });
  it("creates a product and exposes catalogue without owner data", async () => {
    const r = await request("/merchant/products", "POST", {
      title: "قميص كتّان",
      description: "منتج اختبار",
      price: 35000,
      compare_price: 40000,
      variants: [{ size: "M", color: "عاجي", stock: 2 }],
    });
    expect(r.status).toBe(201);
    productId = r.json.id;
    const shop = await request("/shops/tenant-a");
    variant = shop.json.products[0].variants[0].id;
    expect(shop.json.store.owner_id).toBeUndefined();
    expect(shop.json.products[0].price).toBe(35000);
  });
  it("does not let another tenant view or mutate resources", async () => {
    const r = await request(
      "/auth/register",
      "POST",
      registration("tenant-b"),
      "",
    );
    other = r.cookie!;
    expect(
      (
        await request(
          `/merchant/products/${productId}/variants/${variant}`,
          "PATCH",
          { stock: 999, expected_stock: 2 },
          other,
        )
      ).status,
    ).toBe(404);
    expect(
      (await request("/merchant/products", "GET", undefined, other)).json,
    ).toEqual([]);
  });
  it("persists checkout with server prices and idempotency, reserves once", async () => {
    const payload = checkout();
    const r = await request("/shops/tenant-a/orders", "POST", payload, "");
    expect(r.status).toBe(201);
    receipt = r.json.receipt_token;
    const repeated = await request(
      "/shops/tenant-a/orders",
      "POST",
      payload,
      "",
    );
    expect(repeated.json.receipt_token).toBe(receipt);
    expect(
      (
        await db
          .prepare("SELECT stock FROM variants WHERE id=?")
          .bind(variant)
          .first<any>()
      ).stock,
    ).toBe(1);
    expect(
      (
        await request(
          "/shops/tenant-a/orders",
          "POST",
          { ...payload, address: "عنوان آخر مختلف" },
          "",
        )
      ).status,
    ).toBe(409);
    const confirmation = await request(`/shops/tenant-a/receipts/${receipt}`);
    expect(confirmation.json.total).toBe(40000);
    expect(confirmation.json.phone).toBeUndefined();
    orderId = confirmation.json.id;
  });
  it("resists concurrent oversell and isolates orders", async () => {
    const results = await Promise.all([
      request("/shops/tenant-a/orders", "POST", checkout(), ""),
      request("/shops/tenant-a/orders", "POST", checkout(), ""),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(1);
    expect(
      (await request(`/merchant/orders/${orderId}`, "GET", undefined, other))
        .status,
    ).toBe(404);
    expect(
      (
        await db
          .prepare("SELECT stock FROM variants WHERE id=?")
          .bind(variant)
          .first<any>()
      ).stock,
    ).toBe(0);
  });
  it("rejects invalid status and restores cancelled stock exactly once", async () => {
    expect(
      (
        await request(`/merchant/orders/${orderId}/status`, "PATCH", {
          status: "delivered",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(`/merchant/orders/${orderId}/status`, "PATCH", {
          status: "cancelled",
        })
      ).status,
    ).toBe(200);
    await request(`/merchant/orders/${orderId}/status`, "PATCH", {
      status: "cancelled",
    });
    expect(
      (
        await db
          .prepare("SELECT stock FROM variants WHERE id=?")
          .bind(variant)
          .first<any>()
      ).stock,
    ).toBe(1);
    const details = await request(`/merchant/orders/${orderId}`);
    expect(details.json.history.map((h: any) => h.status)).toEqual([
      "new",
      "cancelled",
    ]);
  });
  it("updates product metadata with validated discounts and scoped ownership", async () => {
    const payload = {
      title: "قميص كتّان محدّث",
      description: "وصف جديد",
      price: 35000,
      compare_price: 39000,
      active: true,
    };
    expect(
      (await request(`/merchant/products/${productId}`, "PATCH", payload))
        .status,
    ).toBe(200);
    expect(
      (
        await request(`/merchant/products/${productId}`, "PATCH", {
          ...payload,
          compare_price: 1,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          `/merchant/products/${productId}`,
          "PATCH",
          payload,
          other,
        )
      ).status,
    ).toBe(404);
  });
  it("does not overwrite stock changed by another operation", async () => {
    expect(
      (
        await request(
          `/merchant/products/${productId}/variants/${variant}`,
          "PATCH",
          { stock: 4, expected_stock: 1 },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `/merchant/products/${productId}/variants/${variant}`,
          "PATCH",
          { stock: 99, expected_stock: 1 },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await db
          .prepare("SELECT stock FROM variants WHERE id=?")
          .bind(variant)
          .first<any>()
      ).stock,
    ).toBe(4);
  });
  it("rolls back metadata when a concurrent stock edit conflicts", async () => {
    const r = await request(`/merchant/products/${productId}`, "PATCH", {
      title: "يجب ألا يحفظ",
      description: "",
      price: 35000,
      active: true,
      stock_updates: [{ id: variant, stock: 20, expected_stock: 1 }],
    });
    expect(r.status).toBe(409);
    expect(
      (
        await db
          .prepare("SELECT title FROM products WHERE id=?")
          .bind(productId)
          .first<any>()
      ).title,
    ).toBe("قميص كتّان محدّث");
  });
  it("rejects cross-tenant categories and image attachment", async () => {
    const cat = await request(
      "/merchant/categories",
      "POST",
      { name: "تصنيف خاص" },
      other,
    );
    const payload = {
      title: "منتج اختبار",
      description: "",
      price: 9000,
      variants: [{ size: "M", color: "X", stock: 2 }],
    };
    expect(
      (
        await request("/merchant/products", "POST", {
          ...payload,
          category_id: cat.json.id,
        })
      ).status,
    ).toBe(422);
    const me = await request("/auth/me", "GET", undefined, other);
    expect(
      (
        await request("/merchant/products", "POST", {
          ...payload,
          image: `/api/images/${me.json.store.id}/${crypto.randomUUID()}.png`,
        })
      ).status,
    ).toBe(422);
  });
  it("checks upload bytes and serves owned images through local R2", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(["<svg/>"], { type: "image/png" }),
      "fake.png",
    );
    const badPayload = new Request(origin + "/api/images", {
      method: "POST",
      body: form,
    });
    const bad = await mf.dispatchFetch(badPayload.url, {
      method: "POST",
      headers: {
        origin,
        cookie,
        "content-type": badPayload.headers.get("content-type")!,
      },
      body: await badPayload.arrayBuffer(),
    });
    expect(bad.status).toBe(415);
    const good = new FormData();
    good.append(
      "file",
      new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], {
        type: "image/png",
      }),
      "test.png",
    );
    const goodPayload = new Request(origin + "/api/images", {
      method: "POST",
      body: good,
    });
    const uploaded = await mf.dispatchFetch(goodPayload.url, {
      method: "POST",
      headers: {
        origin,
        cookie,
        "content-type": goodPayload.headers.get("content-type")!,
      },
      body: await goodPayload.arrayBuffer(),
    });
    expect(uploaded.status).toBe(201);
    const url = ((await uploaded.json()) as any).url;
    const fetched = await mf.dispatchFetch(origin + url);
    expect(fetched.headers.get("content-type")).toBe("image/png");
    expect((await fetched.arrayBuffer()).byteLength).toBe(8);
  });
  it("enforces the trial product limit at the database boundary", async () => {
    for (let i = 1; i < 30; i++)
      await db
        .prepare(
          "INSERT INTO products(id,store_id,title,description,price) VALUES(?,?,?,?,?)",
        )
        .bind(crypto.randomUUID(), storeId, "منتج اختبار " + i, "", 100)
        .run();
    const r = await request("/merchant/products", "POST", {
      title: "فوق الحد",
      description: "",
      price: 9000,
      variants: [{ size: "M", color: "X", stock: 2 }],
    });
    expect(r.status).toBe(403);
    expect(
      (
        await db
          .prepare("SELECT COUNT(*) total FROM products WHERE store_id=?")
          .bind(storeId)
          .first<any>()
      ).total,
    ).toBe(30);
  });
  it("keeps Instagram unavailable even for an operator-activated plus subscription", async () => {
    await db
      .prepare(
        "UPDATE subscriptions SET plan='plus',status='active' WHERE store_id=?",
      )
      .bind(storeId)
      .run();
    expect((await request("/auth/me")).json.capabilities.instagram).toBe(true);
    expect(
      (await request("/merchant/integrations/instagram", "POST", {})).status,
    ).toBe(503);
    await db
      .prepare(
        "UPDATE subscriptions SET plan='basic',status='trial' WHERE store_id=?",
      )
      .bind(storeId)
      .run();
  });
  it("records plan requests without granting paid capabilities", async () => {
    expect(
      (
        await request("/merchant/subscription/request", "POST", {
          plan: "plus",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await request("/merchant/subscription/request", "POST", {
          plan: "plus",
        })
      ).status,
    ).toBe(409);
    expect((await request("/auth/me")).json.subscription.plan).toBe("basic");
    expect(
      (await request("/merchant/integrations/instagram", "POST", {})).status,
    ).toBe(403);
    expect(
      (
        await request("/merchant/subscription/request", "POST", {
          plan: "delivery",
        })
      ).status,
    ).toBe(422);
  });
  it("enforces expiry on server for product writes and checkout", async () => {
    await db
      .prepare("UPDATE subscriptions SET expires_at=1 WHERE store_id=?")
      .bind(storeId)
      .run();
    expect(
      (
        await request("/merchant/products", "POST", {
          title: "منتج آخر",
          price: 100,
          description: "",
          variants: [{ size: "M", color: "X", stock: 4 }],
        })
      ).status,
    ).toBe(403);
    expect(
      (await request("/shops/tenant-a/orders", "POST", checkout(), "")).status,
    ).toBe(403);
    expect(
      (
        await request("/merchant/subscription/request", "POST", {
          plan: "basic",
        })
      ).status,
    ).toBe(409);
  });
  it("revokes a logged-out session", async () => {
    expect((await request("/auth/logout", "POST", {})).status).toBe(200);
    expect((await request("/auth/me")).status).toBe(401);
  });
});
