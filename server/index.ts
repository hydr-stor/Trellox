import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "./types";
import { auth } from "./auth";
import { merchant } from "./routes/merchant";
import { products } from "./routes/products";
import { shop } from "./routes/shop";
import { images } from "./routes/images";
const app = new Hono<AppEnv>();
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "blob:", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
    referrerPolicy: "no-referrer",
  }),
);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    const expected = new URL(c.req.url).origin;
    const local =
      c.env.APP_ENV === "local" &&
      !!origin &&
      /^http:\/\/(localhost|127\.0\.0\.1):(5173|8787)$/.test(origin);
    if (origin !== expected && !local)
      return c.json({ error: "مصدر الطلب غير مسموح" }, 403);
  }
  await next();
});
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 3 * 1024 * 1024 + 16384,
    onError: (c) =>
      c.json({ error: "الملف أو الطلب أكبر من الحجم المسموح" }, 413),
  }),
);
app.get("/api/health", (c) =>
  c.json({ ok: true, service: "riwaq", environment: c.env.APP_ENV }),
);
app.route("/api/auth", auth);
app.route("/api/merchant/products", products);
app.route("/api/merchant", merchant);
app.route("/api/shops", shop);
app.route("/api/images", images);
app.all("/api/*", (c) => c.json({ error: "المسار غير موجود" }, 404));
app.all("*", (c) =>
  c.env.ASSETS
    ? c.env.ASSETS.fetch(c.req.raw)
    : c.text("Frontend served by Vite locally", 404),
);
app.onError((error, c) => {
  if (error instanceof HTTPException)
    return c.json({ error: error.message }, error.status);
  console.error("API failure", error.name);
  return c.json({ error: "تعذر إكمال العملية. حاول مرة ثانية." }, 500);
});
export default app;
