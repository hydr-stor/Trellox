import { useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Plus, Search, SlidersHorizontal, Pencil } from "lucide-react";

import { useResource } from "../api";

import {
  Alert,
  Button,
  Empty,
  Loading,
  PageTitle,
  ProductImage,
} from "../components/ui";

import { money } from "../../shared/brand";

import type { Product } from "../types";
import ProductEditor from "./merchant/ProductEditor";

export default function Products() {
  const [params, setParams] = useSearchParams(),
    { data, error, loading, reload } =
      useResource<Product[]>("/merchant/products");
  const [editing, setEditing] = useState<Product | null>(null);
  const [show, setShow] = useState(params.get("new") === "1");
  const [search, setSearch] = useState(params.get("q") || ""),
    [filter, setFilter] = useState("all"),
    [notice, setNotice] = useState("");
  const rows = (data || []).filter(
    (p) =>
      p.title.includes(search) &&
      (filter === "all" ||
        (filter === "low" ? p.variants.some((v) => v.stock < 5) : !p.active)),
  );
  return (
    <>
      <PageTitle
        title="منتجاتك، بتفاصيلها."
        description="كل قطعة لها حكاية. خلّي التفاصيل تسهّل الاختيار."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setShow(true);
          }}
        >
          <Plus size={19} />
          أضف منتج
        </Button>
      </PageTitle>
      {notice && <Alert success>{notice}</Alert>}
      <div className="collection-summary">
        <span>
          {data?.length || 0}
          <small>منتج في مجموعتك</small>
        </span>
        <p>
          مخزون مستقل لكل مقاس ولون.
          <br />
          الأسعار بالدينار العراقي، بدون كسور.
        </p>
      </div>
      <section className="panel">
        <div className="list-toolbar">
          <div className="search-input">
            <Search size={19} />
            <input
              aria-label="ابحث عن منتج"
              placeholder="ابحث عن منتج…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="filter-select">
            <SlidersHorizontal size={17} />
            <select
              aria-label="تصفية المنتجات"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">كل المنتجات</option>
              <option value="low">مخزون منخفض</option>
              <option value="hidden">منتجات مخفية</option>
            </select>
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Alert>{error}</Alert>
        ) : rows.length ? (
          <div className="product-admin-grid">
            {rows.map((p) => (
              <article className="product-admin-card" key={p.id}>
                <div className="product-admin-image">
                  <ProductImage src={p.image} title={p.title} />
                  <span className={`badge ${p.active ? "" : "muted"}`}>
                    {p.active ? "منشور" : "مخفي"}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`تعديل ${p.title}`}
                    onClick={() => {
                      setEditing(p);
                      setShow(true);
                    }}
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <div className="product-admin-info">
                  <small>{p.category_name || "بدون تصنيف"}</small>
                  <h2>{p.title}</h2>
                  <div>
                    <strong>{money(p.price)}</strong>
                    {p.compare_price && <del>{money(p.compare_price)}</del>}
                  </div>
                  <footer>
                    <span>
                      {p.variants.reduce((sum, v) => sum + v.stock, 0)} قطعة
                      بالمخزون
                    </span>
                    <span>{p.variants.length} نوع</span>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title={
              search || filter !== "all"
                ? "ما لقينا نتيجة."
                : "خلّي أول قطعة تنشاف."
            }
            text={
              search
                ? "جرّب اسمًا آخر أو غيّر الفلتر."
                : "أضف صورة ووصف وسعر، وحدد مقاسات وألوان منتجك."
            }
          >
            <Button
              onClick={() => {
                setEditing(null);
                setShow(true);
              }}
            >
              <Plus size={17} />
              إضافة منتج
            </Button>
          </Empty>
        )}
      </section>
      {show && (
        <ProductEditor
          product={editing}
          onClose={() => {
            setShow(false);
            params.delete("new");
            setParams(params, { replace: true });
          }}
          onSaved={() => {
            setShow(false);
            setNotice(
              editing ? "تم حفظ التعديلات" : "منتجك الجديد جاهز بالمتجر",
            );
            void reload();
          }}
        />
      )}
    </>
  );
}
