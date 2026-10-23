import { Link } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  ShieldCheck,
} from "lucide-react";

import { Alert, Empty, ProductImage } from "../../components/ui";

import { money } from "../../../shared/brand";

import type { ShopData } from "../../types";
import { type CartLine, cartProducts } from "./model";

export default function CartPage({
  data,
  base,
  cart,
  quantity,
}: {
  data: ShopData;
  base: string;
  cart: CartLine[];
  quantity: (id: string, n: number) => void;
}) {
  const rows = cartProducts(data, cart),
    total = rows.reduce(
      (sum, r) => sum + (r.product?.price || 0) * r.line.quantity,
      0,
    ),
    invalid = rows.some((r) => !r.variant || r.line.quantity > r.variant.stock);
  return (
    <section className="cart-page wrap">
      <Link className="back-link" to={base}>
        <ArrowRight size={17} />
        كمّل تسوّقك
      </Link>
      <h1>اختياراتك الحلوة.</h1>
      {!rows.length ? (
        <Empty
          title="سلتك تنتظر أول اختيار."
          text="اكتشف المجموعة وأضف اللي يعجبك."
        >
          <Link to={base} className="button">
            شوف المنتجات <ArrowLeft size={17} />
          </Link>
        </Empty>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {rows.map(({ line, product, variant }) => (
              <article className="cart-line" key={line.variant_id}>
                <ProductImage
                  src={product?.image || null}
                  title={product?.title || "منتج غير متاح"}
                />
                <div>
                  <h2>{product?.title || "منتج لم يعد متاحًا"}</h2>
                  <p>
                    {variant?.size} / {variant?.color}
                  </p>
                  <strong>{money(product?.price || 0)}</strong>
                  {(!variant || line.quantity > variant.stock) && (
                    <small className="text-danger">
                      الكمية المطلوبة غير متاحة؛ قلّلها أو احذف المنتج.
                    </small>
                  )}
                </div>
                <div className="cart-line-controls">
                  <button
                    className="icon-button"
                    aria-label="حذف المنتج من السلة"
                    onClick={() => quantity(line.variant_id, 0)}
                  >
                    <Trash2 size={17} />
                  </button>
                  <div className="quantity-control">
                    <button
                      aria-label="تقليل الكمية"
                      onClick={() =>
                        quantity(line.variant_id, line.quantity - 1)
                      }
                    >
                      <Minus size={14} />
                    </button>
                    <output>{line.quantity}</output>
                    <button
                      aria-label="زيادة الكمية"
                      disabled={
                        line.quantity >= Math.min(variant?.stock || 0, 100)
                      }
                      onClick={() =>
                        quantity(line.variant_id, line.quantity + 1)
                      }
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="cart-summary">
            <h2>تفاصيل طلبك</h2>
            <div>
              <span>قيمة المنتجات</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>التوصيل</span>
              <span>يتحدد حسب المحافظة</span>
            </div>
            <p>تراجع الإجمالي قبل تأكيد طلبك. الدفع عند الاستلام.</p>
            {!invalid && data.available ? (
              <Link to={base + "/checkout"} className="button full">
                نكمل الطلب <ArrowLeft size={18} />
              </Link>
            ) : (
              <Alert>راجع توفر المنتجات والكمية قبل المتابعة.</Alert>
            )}
            <span className="cart-secure">
              <ShieldCheck size={16} />
              بدون إنشاء حساب
            </span>
          </aside>
        </div>
      )}
    </section>
  );
}
