import { useState, type FormEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";

import { api } from "../../api";

import { Alert, Button, Empty, Field } from "../../components/ui";

import { money } from "../../../shared/brand";

import type { ShopData } from "../../types";
import { type CartLine, cartProducts } from "./model";

export default function Checkout({
  data,
  base,
  cart,
  clear,
}: {
  data: ShopData;
  base: string;
  cart: CartLine[];
  clear: () => void;
}) {
  const navigate = useNavigate(),
    rows = cartProducts(data, cart);
  const [governorate, setGovernorate] = useState(
      data.zones[0]?.governorate || "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const subtotal = rows.reduce(
      (n, r) => n + (r.product?.price || 0) * r.line.quantity,
      0,
    ),
    fee = data.zones.find((z) => z.governorate === governorate)?.fee || 0;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const payload = { ...fields, governorate, items: cart };
    const encoded = JSON.stringify(payload),
      storageKey = `riwaq-checkout-${data.store.id}`;
    const bodyHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(encoded),
        ),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    let saved: { bodyHash: string; key: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      /* invalid local draft is replaced */
    }
    const key = saved?.bodyHash === bodyHash ? saved.key : crypto.randomUUID();
    localStorage.setItem(storageKey, JSON.stringify({ bodyHash, key }));
    try {
      const r = await api(`/shops/${data.store.slug}/orders`, "POST", {
        ...payload,
        idempotency_key: key,
      });
      localStorage.removeItem(storageKey);
      clear();
      navigate(`${base}/receipt/${r.receipt_token}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!cart.length)
    return (
      <Empty title="السلة فارغة" text="أضف منتجات قبل إتمام الطلب.">
        <Link to={base}>العودة للمتجر</Link>
      </Empty>
    );
  return (
    <section className="checkout-page wrap">
      <Link className="back-link" to={base + "/cart"}>
        <ArrowRight size={17} />
        العودة للسلة
      </Link>
      <h1>وين نوصل اختياراتك؟</h1>
      <p>تفاصيل بسيطة، والباقي علينا.</p>
      <div className="checkout-layout">
        <form className="panel stack-form checkout-form" onSubmit={submit}>
          <h2>تفاصيل الاستلام</h2>
          <Field label="الاسم الكامل">
            <input
              name="customer_name"
              autoComplete="name"
              required
              minLength={3}
              maxLength={100}
              placeholder="الاسم اللي يستلم الطلب"
            />
          </Field>
          <Field label="رقم الموبايل" hint="رقم عراقي يبدأ بـ07 أو ‎+9647">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              required
              maxLength={20}
              placeholder="0770 123 4567"
            />
          </Field>
          <div className="form-grid">
            <Field label="المحافظة">
              <select
                required
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
              >
                {!data.zones.length && (
                  <option value="">لا توجد مناطق توصيل</option>
                )}
                {data.zones.map((z) => (
                  <option key={z.governorate}>{z.governorate}</option>
                ))}
              </select>
            </Field>
            <Field label="المنطقة">
              <input
                name="area"
                required
                minLength={2}
                maxLength={100}
                placeholder="مثلًا: الكرادة"
                autoComplete="address-level2"
              />
            </Field>
          </div>
          <Field label="العنوان بالتفصيل">
            <textarea
              name="address"
              required
              minLength={5}
              maxLength={500}
              rows={3}
              placeholder="الشارع، رقم الدار، وأقرب نقطة دالة"
              autoComplete="street-address"
            />
          </Field>
          <Field label="ملاحظة للمتجر — اختياري">
            <textarea name="note" maxLength={500} rows={2} />
          </Field>
          <div className="payment-method">
            <span className="step-check done">
              <Check size={14} />
            </span>
            <div>
              <strong>الدفع عند الاستلام</strong>
              <small>تدفع المبلغ للمندوب بعد وصول الطلب.</small>
            </div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" required />
            اطلعت على <a href="#policy">سياسة الاستبدال والإرجاع</a> وأوافق على
            استخدام التفاصيل لتجهيز الطلب وتوصيله.
          </label>
          {error && <Alert>{error}</Alert>}
          <Button
            type="submit"
            busy={busy}
            disabled={!data.available || !data.zones.length}
          >
            تأكيد الطلب — {money(subtotal + fee)} <ArrowLeft size={18} />
          </Button>
          <small>
            اضغط مرة واحدة. تكرار المحاولة بنفس التفاصيل لا ينشئ طلبًا ثانيًا.
          </small>
        </form>
        <aside className="cart-summary">
          <h2>كلها تفاصيل تستاهل.</h2>
          <div className="checkout-items">
            {rows.map(({ line, product }) => (
              <div key={line.variant_id}>
                <span>
                  {product?.title} × {line.quantity}
                </span>
                <strong>{money((product?.price || 0) * line.quantity)}</strong>
              </div>
            ))}
          </div>
          <div>
            <span>المنتجات</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div>
            <span>التوصيل إلى {governorate}</span>
            <strong>{money(fee)}</strong>
          </div>
          <div className="total-line">
            <strong>الإجمالي</strong>
            <strong>{money(subtotal + fee)}</strong>
          </div>
          <span className="cart-secure">
            <ShieldCheck size={17} />
            لا نطلب معلومات بطاقة دفع
          </span>
        </aside>
      </div>
    </section>
  );
}
