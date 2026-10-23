import { useState, useEffect } from "react";

import { Link, useParams } from "react-router-dom";

import {
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Check,
  MapPin,
  ShieldCheck,
  Copy,
} from "lucide-react";

import { Button, Empty, ProductImage } from "../../components/ui";

import { money } from "../../../shared/brand";

import type { ShopData } from "../../types";

export default function ProductPage({
  data,
  base,
  add,
}: {
  data: ShopData;
  base: string;
  add: (id: string, n: number) => void;
}) {
  const { productId } = useParams(),
    p = data.products.find((p) => p.id === productId);
  const [selected, setSelected] = useState(""),
    [quantity, setQuantity] = useState(1),
    [added, setAdded] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  useEffect(() => {
    setSelected(
      p?.variants.find((v) => v.stock > 0)?.id || p?.variants[0]?.id || "",
    );
    setAdded(false);
    setQuantity(1);
  }, [p?.id]);
  if (!p)
    return (
      <Empty title="المنتج غير موجود" text="يمكنك اكتشاف بقية المجموعة.">
        <Link to={base}>العودة للمتجر</Link>
      </Empty>
    );
  const v = p.variants.find((v) => v.id === selected);
  return (
    <section className="product-page wrap">
      <Link className="back-link" to={base}>
        <ArrowRight size={17} />
        كل المنتجات
      </Link>
      <div className="product-detail-grid">
        <div className="product-detail-image">
          <ProductImage src={p.image} title={p.title} />
        </div>
        <div className="product-detail-copy">
          <span className="product-category">
            {data.categories.find((c) => c.id === p.category_id)?.name ||
              data.store.name}
          </span>
          <h1>{p.title}</h1>
          <div className="product-price">
            <strong>{money(p.price)}</strong>
            {p.compare_price && <del>{money(p.compare_price)}</del>}
          </div>
          <p className="product-description">
            {p.description || "تفاصيل مختارة من متجرنا."}
          </p>
          <fieldset className="variant-picker">
            <legend>المقاس واللون</legend>
            {p.variants.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!option.stock}
                aria-pressed={selected === option.id}
                className={selected === option.id ? "selected" : ""}
                onClick={() => {
                  setSelected(option.id);
                  setAdded(false);
                  setQuantity(1);
                }}
              >
                {option.size} / {option.color}
                {!option.stock ? " — نفد" : ""}
              </button>
            ))}
          </fieldset>
          <div className="product-availability">
            <span className={`status-dot ${v?.stock ? "" : "unavailable"}`} />
            {v?.stock ? `متوفر — ${v.stock} قطعة` : "نفدت الكمية"}
          </div>
          <div className="add-cart-row">
            <div className="quantity-control">
              <button
                aria-label="تقليل الكمية"
                disabled={quantity <= 1}
                onClick={() => setQuantity((n) => n - 1)}
              >
                <Minus size={16} />
              </button>
              <output aria-label="الكمية">{quantity}</output>
              <button
                aria-label="زيادة الكمية"
                disabled={quantity >= Math.min(v?.stock || 0, 100)}
                onClick={() => setQuantity((n) => n + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
            <Button
              disabled={!v?.stock || !data.available}
              onClick={() => {
                if (v) {
                  add(v.id, quantity);
                  setAdded(true);
                }
              }}
            >
              {added ? <Check size={18} /> : <ShoppingBag size={18} />}{" "}
              {added ? "انضاف للسلة" : "أضف للسلة"}
            </Button>
          </div>
          {added && (
            <Link className="button secondary full" to={base + "/cart"}>
              شوف سلتك <ArrowLeft size={17} />
            </Link>
          )}
          <button
            className="text-link"
            onClick={() => {
              if (navigator.clipboard) {
                void navigator.clipboard
                  .writeText(location.href)
                  .then(() => setShareMessage("تم نسخ رابط المنتج"))
                  .catch(() =>
                    setShareMessage("انسخ رابط المنتج من شريط عنوان المتصفح."),
                  );
              } else setShareMessage("انسخ رابط المنتج من شريط عنوان المتصفح.");
            }}
          >
            <Copy size={16} />
            مشاركة رابط المنتج
          </button>
          {shareMessage && (
            <p className="share-feedback" role="status">
              {shareMessage}
            </p>
          )}
          <div className="product-promises">
            <span>
              <MapPin size={18} />
              التوصيل للمحافظات المتاحة عند الطلب
            </span>
            <span>
              <ShieldCheck size={18} />
              الدفع عند الاستلام
            </span>
          </div>
          <details className="product-policy">
            <summary>سياسة الاستبدال والإرجاع</summary>
            <p>{data.store.return_policy}</p>
          </details>
        </div>
      </div>
    </section>
  );
}
