import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types";
import { authenticated, entitled, capabilities } from "../auth";
import {
  audit,
  body,
  fail,
  id,
  imagePath,
  integer,
  ownedImage,
  shortText,
} from "../lib";
import { orderStatuses } from "../../shared/brand";
export const merchant = new Hono<AppEnv>();
merchant.use("*", authenticated);
merchant.get("/dashboard", async (c) => {
  const sid = c.get("store").id;
  const stats = await c.env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM products WHERE store_id=?) products,(SELECT COUNT(*) FROM orders WHERE store_id=?) orders,(SELECT COUNT(*) FROM orders WHERE store_id=? AND status='new') newOrders,(SELECT COALESCE(SUM(total),0) FROM orders WHERE store_id=? AND status='delivered') revenue,(SELECT COUNT(*) FROM variants v JOIN products p ON p.id=v.product_id WHERE p.store_id=? AND v.stock<5 AND p.active=1) lowStock`,
  )
    .bind(sid, sid, sid, sid, sid)
    .first();
  const { results: recent } = await c.env.DB.prepare(
    "SELECT id,number,customer_name,total,status,created_at FROM orders WHERE store_id=? ORDER BY created_at DESC,id DESC LIMIT 6",
  )
    .bind(sid)
    .all();
  const { results: activity } = await c.env.DB.prepare(
    "SELECT event,created_at FROM audit_events WHERE store_id=? ORDER BY created_at DESC LIMIT 5",
  )
    .bind(sid)
    .all();
  return c.json({ stats, recent, activity });
});
merchant.patch("/store", entitled, async (c) => {
  const data = await body(
    c,
    z.object({
      name: shortText,
      description: z.string().max(1000),
      return_policy: z.string().min(5).max(3000),
      logo: imagePath,
    }),
  );
  ownedImage(data.logo, c.get("store").id);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE stores SET name=?,description=?,return_policy=?,logo=? WHERE id=?",
    ).bind(
      data.name,
      data.description,
      data.return_policy,
      data.logo ?? null,
      c.get("store").id,
    ),
    audit(c, "store.updated", c.get("store").id),
  ]);
  return c.json({ ok: true });
});
merchant.get("/categories", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id,name FROM categories WHERE store_id=? ORDER BY name",
  )
    .bind(c.get("store").id)
    .all();
  return c.json(rows.results);
});
merchant.post("/categories", entitled, async (c) => {
  const data = await body(c, z.object({ name: shortText }));
  const key = id();
  try {
    await c.env.DB.prepare(
      "INSERT INTO categories(id,store_id,name) VALUES(?,?,?)",
    )
      .bind(key, c.get("store").id, data.name)
      .run();
  } catch {
    fail(409, "التصنيف موجود بالفعل");
  }
  return c.json({ id: key, name: data.name }, 201);
});
merchant.get("/zones", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT * FROM delivery_zones WHERE store_id=? ORDER BY governorate",
      )
        .bind(c.get("store").id)
        .all()
    ).results,
  ),
);
merchant.post("/zones", entitled, async (c) => {
  const data = await body(
    c,
    z.object({ governorate: shortText, fee: integer.max(1000000) }),
  );
  await c.env.DB.prepare(
    "INSERT INTO delivery_zones(id,store_id,governorate,fee) VALUES(?,?,?,?) ON CONFLICT(store_id,governorate) DO UPDATE SET fee=excluded.fee,active=1",
  )
    .bind(id(), c.get("store").id, data.governorate, data.fee)
    .run();
  return c.json({ ok: true });
});
merchant.delete("/zones/:id", entitled, async (c) => {
  const result = await c.env.DB.prepare(
    "DELETE FROM delivery_zones WHERE id=? AND store_id=?",
  )
    .bind(c.req.param("id"), c.get("store").id)
    .run();
  if (!result.meta.changes) fail(404, "المنطقة غير موجودة");
  return c.json({ ok: true });
});
merchant.get("/orders", async (c) => {
  const status = c.req.query("status");
  const filter =
    status && Object.keys(orderStatuses).includes(status) ? status : null;
  const rows = await c.env.DB.prepare(
    "SELECT id,number,customer_name,phone,governorate,total,status,created_at FROM orders WHERE store_id=? AND (? IS NULL OR status=?) ORDER BY created_at DESC,id DESC LIMIT 100",
  )
    .bind(c.get("store").id, filter, filter)
    .all();
  return c.json(rows.results);
});
merchant.get("/orders/:id", async (c) => {
  const order = await c.env.DB.prepare(
    "SELECT * FROM orders WHERE id=? AND store_id=?",
  )
    .bind(c.req.param("id"), c.get("store").id)
    .first();
  if (!order) fail(404, "الطلب غير موجود");
  const [items, history] = await Promise.all([
    c.env.DB.prepare(
      "SELECT title,size,color,quantity,unit_price FROM order_items WHERE order_id=?",
    )
      .bind(order.id)
      .all(),
    c.env.DB.prepare(
      "SELECT status,created_at FROM order_history WHERE order_id=? ORDER BY created_at,rowid",
    )
      .bind(order.id)
      .all(),
  ]);
  return c.json({ ...order, items: items.results, history: history.results });
});
merchant.patch("/orders/:id/status", entitled, async (c) => {
  const { status } = await body(
    c,
    z.object({
      status: z.enum([
        "new",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ]),
    }),
  );
  const order = await c.env.DB.prepare(
    "SELECT id,status FROM orders WHERE id=? AND store_id=?",
  )
    .bind(c.req.param("id"), c.get("store").id)
    .first<{ id: string; status: string }>();
  if (!order) fail(404, "الطلب غير موجود");
  if (order.status === status) return c.json({ ok: true });
  try {
    const results = await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE orders SET status=? WHERE id=? AND store_id=? AND status=?",
      ).bind(status, order.id, c.get("store").id, order.status),
      audit(c, `order.${status}`, order.id),
    ]);
    if (!results[0].meta.changes) fail(409, "تغيّر الطلب. حدّث الصفحة.");
  } catch {
    fail(409, "لا يمكن الانتقال لهذه الحالة. حدّث الطلب وتحقق من التسلسل.");
  }
  return c.json({ ok: true });
});
merchant.get("/subscription", async (c) => {
  const pending = await c.env.DB.prepare(
    "SELECT id,plan,status,created_at FROM subscription_requests WHERE store_id=? ORDER BY created_at DESC LIMIT 5",
  )
    .bind(c.get("store").id)
    .all();
  return c.json({
    subscription: c.get("subscription"),
    capabilities: capabilities(c.get("subscription")),
    requests: pending.results,
    integrations: { instagram: false, delivery: false, payment: false },
  });
});
merchant.post("/subscription/request", async (c) => {
  const { plan } = await body(c, z.object({ plan: z.enum(["basic", "plus"]) }));
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO subscription_requests(id,store_id,plan) VALUES(?,?,?)",
      ).bind(id(), c.get("store").id, plan),
      audit(c, "subscription.requested", c.get("store").id),
    ]);
  } catch {
    fail(409, "عندك طلب اشتراك قيد المراجعة بالفعل");
  }
  return c.json(
    {
      ok: true,
      message: "تم تسجيل طلبك للمراجعة. لم يتم خصم أي مبلغ أو تغيير الباقة.",
    },
    201,
  );
});
merchant.post("/integrations/instagram", entitled, (c) => {
  if (!capabilities(c.get("subscription")).instagram)
    fail(403, "هذه الإمكانية تحتاج الباقة الثانية المفعّلة");
  fail(503, "تكامل Instagram غير مفعّل بعد");
});
merchant.post("/integrations/delivery", () =>
  fail(503, "تكامل شركات التوصيل قريبًا؛ لا توجد شركة مربوطة بعد"),
);
