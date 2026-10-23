import { useState, type FormEvent } from "react";

import { Plus, ImagePlus, X, Check } from "lucide-react";

import { api, useResource } from "../../api";

import { Alert, Button, Field, ProductImage, Sheet } from "../../components/ui";

import type { Product } from "../../types";
export default function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [image, setImage] = useState(product?.image || null),
    [variants, setVariants] = useState(
      product?.variants.map((v) => ({ ...v })) || [
        { id: "", product_id: "", size: "قياسي", color: "أساسي", stock: 1 },
      ],
    ),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const { data: categories, reload: reloadCategories } = useResource<
    { id: string; name: string }[]
  >("/merchant/categories");
  const [newCategory, setNewCategory] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api<{ url: string }>("/images", "POST", data);
      setImage(result.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const data = {
      title: f.get("title"),
      description: f.get("description"),
      price: Number(f.get("price")),
      compare_price: f.get("compare_price")
        ? Number(f.get("compare_price"))
        : null,
      category_id: f.get("category_id") || null,
      image,
      active: f.get("active") === "on",
    };
    try {
      if (product) {
        await api(`/merchant/products/${product.id}`, "PATCH", {
          ...data,
          stock_updates: variants
            .filter(
              (v) =>
                v.stock !== product.variants.find((p) => p.id === v.id)?.stock,
            )
            .map((v) => ({
              id: v.id,
              stock: v.stock,
              expected_stock: product.variants.find((p) => p.id === v.id)!
                .stock,
            })),
        });
      } else
        await api("/merchant/products", "POST", {
          ...data,
          variants: variants.map(({ size, color, stock }) => ({
            size,
            color,
            stock,
          })),
        });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function category() {
    if (newCategory.trim().length < 2) return;
    try {
      await api("/merchant/categories", "POST", { name: newCategory });
      setNewCategory("");
      await reloadCategories();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Sheet
      title={product ? "تعديل المنتج" : "قطعة جديدة بمتجرك"}
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={save}>
        <div className="upload-box">
          <ProductImage src={image} title="معاينة صورة المنتج" />
          <label className="button secondary">
            <ImagePlus size={18} />
            {uploading ? "جاري رفع الصورة…" : "اختيار صورة"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
          <small>JPG / PNG / WebP · حتى ٣ ميغابايت</small>
        </div>
        <Field label="اسم المنتج">
          <input
            name="title"
            defaultValue={product?.title}
            minLength={2}
            maxLength={120}
            required
            placeholder="مثلًا: قميص كتّان طبيعي"
          />
        </Field>
        <Field label="الوصف">
          <textarea
            name="description"
            defaultValue={product?.description}
            maxLength={4000}
            rows={3}
            placeholder="المادة، التفاصيل، وكل ما يساعد زبونك يختار."
          />
        </Field>
        <div className="form-grid">
          <Field label="السعر — د.ع">
            <input
              name="price"
              type="number"
              min={0}
              max={100000000}
              step={1}
              required
              defaultValue={product?.price}
              placeholder="35000"
            />
          </Field>
          <Field label="السعر قبل الخصم — اختياري">
            <input
              name="compare_price"
              type="number"
              min={0}
              max={100000000}
              step={1}
              defaultValue={product?.compare_price || ""}
              placeholder="45000"
            />
          </Field>
        </div>
        <Field label="التصنيف">
          <select name="category_id" defaultValue={product?.category_id || ""}>
            <option value="">بدون تصنيف</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="inline-form">
          <input
            aria-label="تصنيف جديد"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="تصنيف جديد"
            maxLength={120}
          />
          <Button
            type="button"
            className="secondary"
            onClick={() => void category()}
            disabled={newCategory.trim().length < 2}
          >
            إضافة
          </Button>
        </div>
        <div className="subsection-heading">
          <h3>الخيارات والمخزون</h3>
          {!product && (
            <button
              className="text-link"
              type="button"
              onClick={() =>
                setVariants((v) => [
                  ...v,
                  { id: "", product_id: "", size: "", color: "", stock: 0 },
                ])
              }
            >
              <Plus size={16} />
              نوع آخر
            </button>
          )}
        </div>
        {variants.map((v, i) => (
          <div className="variant-row" key={v.id || i}>
            <Field label="المقاس">
              <input
                required
                maxLength={40}
                readOnly={!!product}
                value={v.size}
                onChange={(e) =>
                  setVariants((rows) =>
                    rows.map((r, j) =>
                      i === j ? { ...r, size: e.target.value } : r,
                    ),
                  )
                }
              />
            </Field>
            <Field label="اللون">
              <input
                required
                maxLength={40}
                readOnly={!!product}
                value={v.color}
                onChange={(e) =>
                  setVariants((rows) =>
                    rows.map((r, j) =>
                      i === j ? { ...r, color: e.target.value } : r,
                    ),
                  )
                }
              />
            </Field>
            <Field label="المخزون">
              <input
                type="number"
                min={0}
                max={1000000}
                step={1}
                required
                value={v.stock}
                onChange={(e) =>
                  setVariants((rows) =>
                    rows.map((r, j) =>
                      i === j ? { ...r, stock: Number(e.target.value) } : r,
                    ),
                  )
                }
              />
            </Field>
            {!product && variants.length > 1 && (
              <button
                type="button"
                className="icon-button"
                aria-label="حذف هذا النوع"
                onClick={() =>
                  setVariants((rows) => rows.filter((_, j) => j !== i))
                }
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product ? !!product.active : true}
          />
          إظهار المنتج بواجهة المتجر
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="sheet-footer">
          <Button type="submit" busy={busy} disabled={uploading}>
            <Check size={18} />
            حفظ المنتج
          </Button>
          <Button type="button" className="secondary" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
