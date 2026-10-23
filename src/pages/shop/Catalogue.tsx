import { Link, useSearchParams } from "react-router-dom";

import {
  ShoppingBag,
  Search,
  ArrowLeft,
  Plus,
  SlidersHorizontal,
} from "lucide-react";

import { Empty, ProductImage, Reveal } from "../../components/ui";

import { money } from "../../../shared/brand";

import type { ShopData } from "../../types";

export default function Catalogue({
  data,
  base,
}: {
  data: ShopData;
  base: string;
}) {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "",
    cat = params.get("category") || "",
    sort = params.get("sort") || "recent";
  let rows = data.products.filter(
    (p) =>
      (!search || p.title.includes(search) || p.description.includes(search)) &&
      (!cat || p.category_id === cat),
  );
  if (sort === "price") rows = rows.slice().sort((a, b) => a.price - b.price);
  if (sort === "price-desc")
    rows = rows.slice().sort((a, b) => b.price - a.price);
  function filter(k: string, v: string) {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    setParams(n, { replace: true });
  }
  return (
    <>
      <section className="shop-hero wrap">
        <Reveal>
          <span className="shop-hero-flower" aria-hidden="true">
            <ShoppingBag size={26} strokeWidth={1.2} />
          </span>
          <h1>
            تفاصيل تحبّها.
            <br />
            <span>واختيارات تشبهك.</span>
          </h1>
          <p>
            {data.store.description ||
              `أهلًا بيك في ${data.store.name}. اختار اللي يعجبك، وخلّي الباقي علينا.`}
          </p>
        </Reveal>
        <div className="shop-hero-aside">
          <span>مختارة بعناية.</span>
          <ArrowLeft size={40} strokeWidth={0.8} />
          <small>{data.products.length} منتج، بانتظار اختيارك.</small>
        </div>
      </section>
      <section className="catalogue wrap">
        <div className="catalogue-toolbar">
          <div className="category-tabs" aria-label="التصنيفات">
            <button
              onClick={() => filter("category", "")}
              className={!cat ? "selected" : ""}
            >
              كل الاختيارات
            </button>
            {data.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => filter("category", c.id)}
                className={cat === c.id ? "selected" : ""}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="catalogue-controls">
            <div className="search-input">
              <Search size={18} />
              <input
                aria-label="البحث في المتجر"
                placeholder="تدور على شي؟"
                value={search}
                onChange={(e) => filter("q", e.target.value)}
              />
            </div>
            <label className="filter-select">
              <SlidersHorizontal size={17} />
              <select
                aria-label="ترتيب المنتجات"
                value={sort}
                onChange={(e) => filter("sort", e.target.value)}
              >
                <option value="recent">الأحدث</option>
                <option value="price">الأقل سعرًا</option>
                <option value="price-desc">الأعلى سعرًا</option>
              </select>
            </label>
          </div>
        </div>
        {rows.length ? (
          <div className="shop-product-grid">
            {rows.map((p) => (
              <Reveal key={p.id}>
                <Link className="shop-product" to={`${base}/p/${p.id}`}>
                  <div className="shop-product-photo">
                    <ProductImage src={p.image} title={p.title} />
                    {p.compare_price && (
                      <span className="product-sale">اختيار بسعر أحلى</span>
                    )}
                    {p.variants.every((v) => v.stock === 0) && (
                      <span className="out-of-stock">نفدت الكمية</span>
                    )}
                    <span className="product-open">
                      <Plus size={20} />
                    </span>
                  </div>
                  <div className="shop-product-info">
                    <div>
                      <h2>{p.title}</h2>
                      <small>{p.variants.length} خيار متاح</small>
                    </div>
                    <div>
                      <strong>{money(p.price)}</strong>
                      {p.compare_price && <del>{money(p.compare_price)}</del>}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty
            title={
              data.products.length
                ? "ما لقينا هذا الاختيار."
                : "المجموعة الأولى بالطريق."
            }
            text={
              data.products.length
                ? "جرّب اسمًا أو تصنيفًا ثانيًا."
                : "المتجر بعده يجهّز منتجاته. ارجع قريبًا."
            }
          />
        )}
      </section>
    </>
  );
}
