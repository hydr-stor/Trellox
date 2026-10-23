import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types";
import { authenticated, entitled } from "../auth";
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
const productBase = z.object({
  title: shortText,
  description: z.string().max(4000),
  price: integer,
  compare_price: integer.nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  image: imagePath,
  active: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        size: z.string().trim().min(1).max(40),
        color: z.string().trim().min(1).max(40),
        stock: integer.max(1000000),
      }),
    )
    .min(1)
    .max(100),
});
const editSchema = productBase
  .omit({ variants: true })
  .extend({
    stock_updates: z
      .array(
        z.object({
          id: z.string().uuid(),
          stock: integer.max(1000000),
          expected_stock: integer.max(1000000),
        }),
      )
      .max(100)
      .default([]),
  })
  .refine((d) => !d.compare_price || d.compare_price > d.price, {
    message: "السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي",
  });
export const productSchema = productBase
  .refine((d) => !d.compare_price || d.compare_price > d.price, {
    message: "السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي",
  })
  .refine(
    (d) =>
      new Set(d.variants.map((v) => `${v.size}:${v.color}`)).size ===
      d.variants.length,
    { message: "لا تكرر نفس المقاس واللون" },
  );
export const products = new Hono<AppEnv>();
products.use("*", authenticated);
products.get("/", async (c) => {
  const sid = c.get("store").id;
  const { results: rows } = await c.env.DB.prepare(
    "SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.store_id=? ORDER BY p.created_at DESC,p.id DESC LIMIT 500",
  )
    .bind(sid)
    .all();
  const { results: variants } = await c.env.DB.prepare(
    "SELECT v.* FROM variants v JOIN products p ON p.id=v.product_id WHERE p.store_id=?",
  )
    .bind(sid)
    .all();
  return c.json(
    rows.map((p) => ({
      ...p,
      variants: variants.filter((v) => v.product_id === p.id),
    })),
  );
});
products.post("/", entitled, async (c) => {
  const d = await body(c, productSchema);
  const sid = c.get("store").id;
  ownedImage(d.image, sid);
  if (
    d.category_id &&
    !(await c.env.DB.prepare(
      "SELECT id FROM categories WHERE id=? AND store_id=?",
    )
      .bind(d.category_id, sid)
      .first())
  )
    fail(422, "التصنيف لا يخص متجرك");
  const pid = id();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO products(id,store_id,category_id,title,description,price,compare_price,image,active) VALUES(?,?,?,?,?,?,?,?,?)",
      ).bind(
        pid,
        sid,
        d.category_id ?? null,
        d.title,
        d.description,
        d.price,
        d.compare_price || null,
        d.image ?? null,
        d.active ? 1 : 0,
      ),
      ...d.variants.map((v) =>
        c.env.DB.prepare(
          "INSERT INTO variants(id,product_id,size,color,stock) VALUES(?,?,?,?,?)",
        ).bind(id(), pid, v.size, v.color, v.stock),
      ),
      audit(c, "product.created", pid),
    ]);
  } catch (e) {
    if (String(e).includes("product_limit"))
      fail(403, "وصلت إلى حد المنتجات في باقتك");
    if (String(e).includes("subscription_expired")) fail(403, "انتهى الاشتراك");
    throw e;
  }
  return c.json({ id: pid }, 201);
});
products.patch("/:id", entitled, async (c) => {
  const d = await body(c, editSchema);
  const sid = c.get("store").id,
    pid = c.req.param("id");
  if (
    !(await c.env.DB.prepare(
      "SELECT id FROM products WHERE id=? AND store_id=?",
    )
      .bind(pid, sid)
      .first())
  )
    fail(404, "المنتج غير موجود");
  ownedImage(d.image, sid);
  if (
    d.category_id &&
    !(await c.env.DB.prepare(
      "SELECT id FROM categories WHERE id=? AND store_id=?",
    )
      .bind(d.category_id, sid)
      .first())
  )
    fail(422, "تصنيف غير صحيح");
  for (const v of d.stock_updates) {
    if (
      !(await c.env.DB.prepare(
        "SELECT id FROM variants WHERE id=? AND product_id=?",
      )
        .bind(v.id, pid)
        .first())
    )
      fail(404, "النوع غير موجود");
  }
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE products SET title=?,description=?,price=?,compare_price=?,category_id=?,image=?,active=? WHERE id=? AND store_id=?",
      ).bind(
        d.title,
        d.description,
        d.price,
        d.compare_price || null,
        d.category_id ?? null,
        d.image ?? null,
        d.active ? 1 : 0,
        pid,
        sid,
      ),
      ...d.stock_updates.map((v) =>
        c.env.DB.prepare(
          "UPDATE variants SET stock=CASE WHEN stock=? THEN ? ELSE -1 END WHERE id=? AND product_id=?",
        ).bind(v.expected_stock, v.stock, v.id, pid),
      ),
      audit(c, "product.updated", pid),
    ]);
  } catch {
    fail(
      409,
      "تغيّر المخزون. لم يتم حفظ التعديلات، حدّث الصفحة وحاول مرة ثانية.",
    );
  }
  return c.json({ ok: true });
});
products.patch("/:id/variants/:variantId", entitled, async (c) => {
  const d = await body(
    c,
    z.object({
      stock: integer.max(1000000),
      expected_stock: integer.max(1000000),
    }),
  );
  const result = await c.env.DB.prepare(
    "UPDATE variants SET stock=? WHERE id=? AND product_id=? AND stock=? AND product_id IN (SELECT id FROM products WHERE store_id=?)",
  )
    .bind(
      d.stock,
      c.req.param("variantId"),
      c.req.param("id"),
      d.expected_stock,
      c.get("store").id,
    )
    .run();
  if (!result.meta.changes) {
    const owned = await c.env.DB.prepare(
      "SELECT v.id FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND p.id=? AND p.store_id=?",
    )
      .bind(c.req.param("variantId"), c.req.param("id"), c.get("store").id)
      .first();
    if (!owned) fail(404, "النوع غير موجود");
    fail(409, "تغيّر المخزون بطلب آخر. حدّث الصفحة قبل تعديل الكمية.");
  }
  return c.json({ ok: true });
});
