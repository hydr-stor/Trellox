import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { z } from "zod";
import type { AppEnv, User, Store, Subscription } from "./types";
import { body, fail, hash, hex, id, now, shortText, token } from "./lib";
import { brand, plans } from "../shared/brand";
const options = { N: 16384, r: 8, p: 2, dkLen: 32 };
async function passwordHash(password: string, salt = token()) {
  return `scrypt$${salt}$${hex(await scryptAsync(password, salt, options))}`;
}
async function verify(password: string, stored: string) {
  const [, salt] = stored.split("$");
  if (!salt) return false;
  const candidate = await passwordHash(password, salt);
  if (candidate.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < stored.length; i++)
    diff |= candidate.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}
const cookieName = (env: string) =>
  env === "local" ? "riwaq_session" : "__Host-riwaq_session";
function cookie(
  c: Parameters<typeof setCookie>[0],
  value: string,
  local: boolean,
) {
  setCookie(c, cookieName(local ? "local" : "production"), value, {
    httpOnly: true,
    secure: !local,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
export const authenticated = createMiddleware<AppEnv>(async (c, next) => {
  const raw = getCookie(c, cookieName(c.env.APP_ENV));
  if (!raw) fail(401, "سجّل دخولك للمتابعة");
  const user = await c.env.DB.prepare(
    "SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await hash(raw), now())
    .first<User>();
  if (!user) fail(401, "انتهت الجلسة، سجّل دخولك مجدداً");
  const store = await c.env.DB.prepare("SELECT * FROM stores WHERE owner_id=?")
    .bind(user.id)
    .first<Store>();
  if (!store) fail(403, "لا تملك متجرًا");
  const sub = await c.env.DB.prepare(
    "SELECT * FROM subscriptions WHERE store_id=?",
  )
    .bind(store.id)
    .first<Subscription>();
  if (!sub) fail(403, "الاشتراك غير متاح");
  c.set("user", user);
  c.set("store", store);
  c.set("subscription", sub);
  await next();
});
export const entitled = createMiddleware<AppEnv>(async (c, next) => {
  const s = c.get("subscription");
  if (!["trial", "active"].includes(s.status) || s.expires_at <= now())
    fail(403, "انتهى الاشتراك. قدّم طلب تفعيل من صفحة الاشتراك.");
  await next();
});
export function capabilities(s: Subscription) {
  const valid = ["trial", "active"].includes(s.status) && s.expires_at > now();
  return {
    commerce: valid,
    products: valid ? (s.status === "trial" ? 30 : plans[s.plan].products) : 0,
    instagram: valid && s.status === "active" && plans[s.plan].instagram,
    deliveryIntegration: false,
  };
}
export const auth = new Hono<AppEnv>();
auth.use("*", async (c, next) => {
  if (
    c.req.method === "POST" &&
    ["/register", "/login"].some((p) => c.req.path.endsWith(p))
  ) {
    const ip = c.req.header("cf-connecting-ip") || "local";
    const key = await hash(`${ip}:${c.req.path}:${Math.floor(now() / 900)}`);
    const row = await c.env.DB.prepare(
      "INSERT INTO auth_attempts(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
      .bind(key, now() + 900)
      .first<{ count: number }>();
    if ((row?.count || 0) > 10) fail(429, "محاولات كثيرة. جرّب بعد ١٥ دقيقة.");
    await c.env.DB.prepare("DELETE FROM auth_attempts WHERE reset_at<?")
      .bind(now())
      .run();
  }
  await next();
});
const credentials = z.object({
  email: z
    .email("اكتب بريدًا إلكترونيًا صحيحًا")
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(12, "كلمة المرور ١٢ حرفًا على الأقل").max(128),
});
auth.post("/register", async (c) => {
  const data = await body(
    c,
    credentials.extend({
      name: shortText,
      storeName: shortText,
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(
          /^[a-z0-9][a-z0-9-]{2,39}$/,
          "الرابط من ٣–٤٠ حرفًا إنجليزيًا أو رقمًا أو شرطة",
        ),
    }),
  );
  if (
    await c.env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(data.email)
      .first()
  )
    fail(409, "تعذر إنشاء الحساب بهذا البريد. جرّب تسجيل الدخول.");
  if (
    await c.env.DB.prepare("SELECT id FROM stores WHERE slug=?")
      .bind(data.slug)
      .first()
  )
    fail(409, "رابط المتجر مستخدم، اختر رابطًا آخر");
  const uid = id(),
    sid = id(),
    raw = token();
  const ph = await passwordHash(data.password);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)",
      ).bind(uid, data.name, data.email, ph),
      c.env.DB.prepare(
        "INSERT INTO stores(id,owner_id,name,slug) VALUES(?,?,?,?)",
      ).bind(sid, uid, data.storeName, data.slug),
      c.env.DB.prepare(
        "INSERT INTO subscriptions(store_id,plan,status,expires_at) VALUES(?,'basic','trial',?)",
      ).bind(sid, now() + brand.trialDays * 86400),
      c.env.DB.prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      ).bind(await hash(raw), uid, now() + 604800),
      c.env.DB.prepare(
        "INSERT INTO delivery_zones(id,store_id,governorate,fee) VALUES(?,?,?,?)",
      ).bind(id(), sid, "بغداد", 5000),
      c.env.DB.prepare(
        "INSERT INTO audit_events(id,store_id,actor_id,event,resource_id) VALUES(?,?,?,?,?)",
      ).bind(id(), sid, uid, "store.created", sid),
    ]);
  } catch {
    fail(409, "تعذر إنشاء الحساب. جرّب بريدًا أو رابطًا آخر.");
  }
  cookie(c, raw, c.env.APP_ENV === "local");
  return c.json({ ok: true }, 201);
});
auth.post("/login", async (c) => {
  const data = await body(c, credentials);
  const user = await c.env.DB.prepare(
    "SELECT id,password_hash FROM users WHERE email=?",
  )
    .bind(data.email)
    .first<{ id: string; password_hash: string }>();
  const dummy =
    "scrypt$0000000000000000000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
  const correct = await verify(data.password, user?.password_hash || dummy);
  if (!user || !correct) fail(401, "البريد أو كلمة المرور غير صحيحة");
  const raw = token();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
    ).bind(await hash(raw), user.id, now() + 604800),
    c.env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now()),
  ]);
  cookie(c, raw, c.env.APP_ENV === "local");
  return c.json({ ok: true });
});
auth.get("/me", authenticated, (c) =>
  c.json({
    user: c.get("user"),
    store: c.get("store"),
    subscription: c.get("subscription"),
    capabilities: capabilities(c.get("subscription")),
  }),
);
auth.post("/logout", authenticated, async (c) => {
  const raw = getCookie(c, cookieName(c.env.APP_ENV));
  await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
    .bind(await hash(raw || ""))
    .run();
  deleteCookie(c, cookieName(c.env.APP_ENV), { path: "/" });
  return c.json({ ok: true });
});
