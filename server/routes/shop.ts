import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv, Store, Subscription } from "../types";
import { body, fail, hash, id, now, token } from "../lib";
import { capabilities } from "../auth";
export const shop = new Hono<AppEnv>();
shop.get("/:slug", async (c) => {
  const store = await c.env.DB.prepare(
    "SELECT id,name,slug,description,logo,accent,return_policy FROM stores WHERE slug=?",
  )
    .bind(c.req.param("slug"))
    .first<Store>();
  if (!store) fail(404, "هذا المتجر غير موجود");
  const sub = await c.env.DB.prepare(
    "SELECT * FROM subscriptions WHERE store_id=?",
  )
    .bind(store.id)
    .first<Subscription>();
  const available = !!sub && capabilities(sub).commerce;
  const [products, categories, zones, variants] = await Promise.all([
    c.env.DB.prepare(
      "SELECT id,title,description,price,compare_price,image,category_id FROM products WHERE store_id=? AND active=1 ORDER BY created_at DESC,id DESC LIMIT 500",
    )
      .bind(store.id)
      .all(),
    c.env.DB.prepare(
      "SELECT id,name FROM categories WHERE store_id=? ORDER BY name",
    )
      .bind(store.id)
      .all(),
    c.env.DB.prepare(
      "SELECT governorate,fee FROM delivery_zones WHERE store_id=? AND active=1 ORDER BY governorate",
    )
      .bind(store.id)
      .all(),
    c.env.DB.prepare(
      "SELECT v.id,v.product_id,v.size,v.color,v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE p.store_id=? AND p.active=1",
    )
      .bind(store.id)
      .all(),
  ]);
  return c.json({
    store,
    available,
    categories: categories.results,
    zones: zones.results,
    products: products.results.map((p) => ({
      ...p,
      variants: variants.results.filter((v) => v.product_id === p.id),
    })),
  });
});
const checkout = z
  .object({
    idempotency_key: z.string().uuid(),
    customer_name: z.string().trim().min(3, "اكتب الاسم الكامل").max(100),
    phone: z
      .string()
      .transform((v) =>
        v
          .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
          .replace(/[\s()-]/g, ""),
      )
      .refine(
        (v) => /^(?:\+9647\d{9}|07\d{9})$/.test(v),
        "اكتب رقم موبايل عراقي صحيح",
      ),
    governorate: z.string().min(2).max(80),
    area: z.string().trim().min(2, "اكتب المنطقة").max(100),
    address: z.string().trim().min(5, "اكتب العنوان بالتفصيل").max(500),
    note: z.string().max(500).default(""),
    items: z
      .array(
        z.object({
          variant_id: z.string().uuid(),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (d) => new Set(d.items.map((i) => i.variant_id)).size === d.items.length,
    { message: "توجد أنواع مكررة في السلة" },
  );
shop.post("/:slug/orders", async (c) => {
  const d = await body(c, checkout);
  const store = await c.env.DB.prepare("SELECT id FROM stores WHERE slug=?")
    .bind(c.req.param("slug"))
    .first<{ id: string }>();
  if (!store) fail(404, "المتجر غير موجود");
  const { idempotency_key, ...payload } = d;
  payload.items.sort((a, b) => a.variant_id.localeCompare(b.variant_id));
  const fingerprint = await hash(JSON.stringify(payload));
  const existing = await c.env.DB.prepare(
    "SELECT number,receipt_token,fingerprint FROM orders WHERE store_id=? AND idempotency_key=?",
  )
    .bind(store.id, idempotency_key)
    .first<{ number: string; receipt_token: string; fingerprint: string }>();
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      fail(409, "تغيّرت بيانات الطلب، حدّث السلة وأعد المحاولة");
    return c.json({
      number: existing.number,
      receipt_token: existing.receipt_token,
      replayed: true,
    });
  }
  const sub = await c.env.DB.prepare(
    "SELECT * FROM subscriptions WHERE store_id=?",
  )
    .bind(store.id)
    .first<Subscription>();
  if (!sub || !capabilities(sub).commerce)
    fail(403, "المتجر لا يستقبل طلبات حاليًا");
  const zone = await c.env.DB.prepare(
    "SELECT fee FROM delivery_zones WHERE store_id=? AND governorate=? AND active=1",
  )
    .bind(store.id, d.governorate)
    .first<{ fee: number }>();
  if (!zone) fail(422, "التوصيل غير متاح لهذه المحافظة");
  const lines = [];
  let subtotal = 0;
  for (const item of d.items) {
    const v = await c.env.DB.prepare(
      "SELECT v.id,v.stock,v.size,v.color,p.title,p.price FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND p.store_id=? AND p.active=1",
    )
      .bind(item.variant_id, store.id)
      .first<{
        id: string;
        stock: number;
        size: string;
        color: string;
        title: string;
        price: number;
      }>();
    if (!v || v.stock < item.quantity)
      fail(409, "كمية أحد المنتجات غير متوفرة. حدّث السلة.");
    lines.push({ ...v, quantity: item.quantity });
    subtotal += v.price * item.quantity;
  }
  const oid = id(),
    receipt = token(),
    number = `RW-${now().toString(36).toUpperCase()}-${token().slice(0, 5).toUpperCase()}`;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO orders(id,store_id,number,receipt_token,idempotency_key,fingerprint,customer_name,phone,governorate,area,address,note,subtotal,delivery_fee,total) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        oid,
        store.id,
        number,
        receipt,
        idempotency_key,
        fingerprint,
        d.customer_name,
        d.phone,
        d.governorate,
        d.area,
        d.address,
        d.note,
        subtotal,
        zone.fee,
        subtotal + zone.fee,
      ),
      ...lines.map((l) =>
        c.env.DB.prepare(
          "INSERT INTO order_items(id,order_id,variant_id,title,size,color,unit_price,quantity) VALUES(?,?,?,?,?,?,?,?)",
        ).bind(id(), oid, l.id, l.title, l.size, l.color, l.price, l.quantity),
      ),
      c.env.DB.prepare(
        "INSERT INTO audit_events(id,store_id,event,resource_id) VALUES(?,?,?,?)",
      ).bind(id(), store.id, "order.received", oid),
    ]);
  } catch {
    const replay = await c.env.DB.prepare(
      "SELECT number,receipt_token,fingerprint FROM orders WHERE store_id=? AND idempotency_key=?",
    )
      .bind(store.id, idempotency_key)
      .first<{ number: string; receipt_token: string; fingerprint: string }>();
    if (replay && replay.fingerprint === fingerprint)
      return c.json({
        number: replay.number,
        receipt_token: replay.receipt_token,
        replayed: true,
      });
    fail(409, "تغيّر المخزون أو الطلب. حدّث السلة وحاول مرة أخرى.");
  }
  return c.json({ number, receipt_token: receipt }, 201);
});
shop.get("/:slug/receipts/:token", async (c) => {
  const order = await c.env.DB.prepare(
    "SELECT o.id,o.number,o.status,o.total,o.delivery_fee,o.subtotal,o.created_at FROM orders o JOIN stores s ON s.id=o.store_id WHERE s.slug=? AND o.receipt_token=?",
  )
    .bind(c.req.param("slug"), c.req.param("token"))
    .first();
  if (!order) fail(404, "الطلب غير موجود");
  const items = await c.env.DB.prepare(
    "SELECT title,size,color,quantity,unit_price FROM order_items WHERE order_id=?",
  )
    .bind(order.id)
    .all();
  return c.json({ ...order, items: items.results });
});
