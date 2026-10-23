import { Hono } from "hono";
import type { AppEnv } from "../types";
import { authenticated, entitled } from "../auth";
import { fail, id } from "../lib";
export const images = new Hono<AppEnv>();
images.post("/", authenticated, entitled, async (c) => {
  if (!c.req.header("content-type")?.startsWith("multipart/form-data"))
    fail(415, "ارفع الصورة كملف");
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    fail(422, "ملف الصورة غير صحيح");
  }
  const file = form.get("file");
  if (!(file instanceof File)) fail(422, "اختر صورة");
  if (file.size > 3 * 1024 * 1024) fail(413, "حجم الصورة الأقصى ٣ ميغابايت");
  const buffer = await file.arrayBuffer(),
    bytes = new Uint8Array(buffer);
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const ext = png ? "png" : jpg ? "jpg" : webp ? "webp" : null;
  if (!ext) fail(415, "استخدم صورة PNG أو JPG أو WebP");
  const key = `${c.get("store").id}/${id()}.${ext}`;
  await c.env.IMAGES.put(key, buffer, {
    httpMetadata: {
      contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
    },
  });
  return c.json({ url: `/api/images/${key}` }, 201);
});
images.get("/:store/:file", async (c) => {
  const key = `${c.req.param("store")}/${c.req.param("file")}`;
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\.(webp|png|jpg)$/.test(key))
    fail(404, "الصورة غير موجودة");
  const image = await c.env.IMAGES.get(key);
  if (!image) fail(404, "الصورة غير موجودة");
  return new Response(image.body, {
    headers: {
      "Content-Type":
        image.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public,max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
