import type { Context } from "hono";
import type { AppEnv } from "./types";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
export const id = () => crypto.randomUUID();
export const now = () => Math.floor(Date.now() / 1000);
export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function hash(value: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}
export function fail(
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 503,
  message: string,
): never {
  throw new HTTPException(status, { message });
}
export async function body<T extends z.ZodType>(
  c: Context<AppEnv>,
  schema: T,
): Promise<z.infer<T>> {
  if (!c.req.header("content-type")?.includes("application/json"))
    fail(415, "نوع البيانات غير مدعوم");
  let data: unknown;
  try {
    data = await c.req.json();
  } catch {
    fail(400, "تعذر قراءة البيانات");
  }
  const result = schema.safeParse(data);
  if (!result.success)
    fail(422, result.error.issues[0]?.message || "راجع البيانات المدخلة");
  return result.data;
}
export function audit(c: Context<AppEnv>, event: string, resource: string) {
  return c.env.DB.prepare(
    "INSERT INTO audit_events(id,store_id,actor_id,event,resource_id) VALUES(?,?,?,?,?)",
  ).bind(id(), c.get("store").id, c.get("user").id, event, resource);
}
export const shortText = z
  .string()
  .trim()
  .min(2, "اكتب اسمًا من حرفين على الأقل")
  .max(120);
export const integer = z.number().int().min(0).max(100000000);
export const imagePath = z
  .string()
  .regex(/^\/api\/images\/[a-f0-9-]+\/[a-f0-9-]+\.(webp|png|jpg)$/)
  .nullable()
  .optional();
export function ownedImage(path: string | null | undefined, storeId: string) {
  if (path && !path.startsWith(`/api/images/${storeId}/`))
    fail(422, "الصورة لا تخص هذا المتجر");
}
