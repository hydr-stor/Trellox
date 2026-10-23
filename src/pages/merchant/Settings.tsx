import { useState, type FormEvent } from "react";

import { Check, Plus, Trash2, ImagePlus } from "lucide-react";

import { api, useResource } from "../../api";

import { Alert, Button, Field, PageTitle } from "../../components/ui";

import { useAuth } from "../../context";

import { money } from "../../../shared/brand";

export function SettingsPage() {
  const { profile, refresh } = useAuth(),
    { data: zones, reload } =
      useResource<{ id: string; governorate: string; fee: number }[]>(
        "/merchant/zones",
      );
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [logo, setLogo] = useState(profile?.store.logo || null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/merchant/store", "PATCH", {
        name: f.get("name"),
        description: f.get("description"),
        return_policy: f.get("return_policy"),
        logo,
      });
      await refresh();
      setMessage("تم حفظ إعدادات متجرك");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function zone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api("/merchant/zones", "POST", {
        governorate: f.get("governorate"),
        fee: Number(f.get("fee")),
      });
      await reload();
      form.reset();
      setMessage("تم حفظ أجور التوصيل");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="متجرك، على ذوقك."
        description="تفاصيل الهوية والسياسة والتوصيل، بمكان واحد."
      />
      {message && <Alert success>{message}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="settings-grid">
        <section className="panel settings-section">
          <h2>هوية المتجر</h2>
          <form className="stack-form" onSubmit={save}>
            <div className="store-logo-upload">
              {logo ? (
                <img src={logo} alt="شعار المتجر" />
              ) : (
                <span>{profile?.store.name.slice(0, 1)}</span>
              )}
              <label className="button secondary">
                <ImagePlus size={17} />
                رفع شعار
                <input
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const f = new FormData();
                    f.append("file", file);
                    try {
                      const r = await api("/images", "POST", f);
                      setLogo(r.url);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
              </label>
            </div>
            <Field label="اسم المتجر">
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={profile?.store.name}
              />
            </Field>
            <Field label="نبذة قصيرة">
              <textarea
                name="description"
                rows={3}
                maxLength={1000}
                defaultValue={profile?.store.description}
                placeholder="عرّف زبائنك على متجرك."
              />
            </Field>
            <Field
              label="رابط المتجر"
              hint="الرابط ثابت بالمرحلة الأولى حتى تبقى الروابط المشاركة صالحة."
            >
              <input
                dir="ltr"
                readOnly
                value={`${location.origin}/s/${profile?.store.slug}`}
              />
            </Field>
            <Field label="سياسة الاستبدال والإرجاع">
              <textarea
                name="return_policy"
                rows={4}
                minLength={5}
                maxLength={3000}
                required
                defaultValue={profile?.store.return_policy}
              />
            </Field>
            <Button busy={busy} type="submit">
              <Check size={18} />
              حفظ الإعدادات
            </Button>
          </form>
        </section>
        <section className="panel settings-section">
          <h2>أجور التوصيل</h2>
          <p>
            حدّد المحافظات التي توصل إليها. الطلب يحسب الأجور من هذه القائمة.
          </p>
          <form className="stack-form zone-form" onSubmit={zone}>
            <Field label="المحافظة">
              <select name="governorate" required>
                {[
                  "بغداد",
                  "البصرة",
                  "نينوى",
                  "أربيل",
                  "السليمانية",
                  "دهوك",
                  "الأنبار",
                  "بابل",
                  "كربلاء",
                  "النجف",
                  "القادسية",
                  "واسط",
                  "ديالى",
                  "صلاح الدين",
                  "كركوك",
                  "المثنى",
                  "ميسان",
                  "ذي قار",
                  "حلبجة",
                ].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="أجرة التوصيل — د.ع">
              <input
                name="fee"
                type="number"
                min={0}
                max={1000000}
                step={1}
                required
                placeholder="5000"
              />
            </Field>
            <Button className="secondary" type="submit">
              <Plus size={17} />
              إضافة أو تحديث
            </Button>
          </form>
          <div className="zone-list">
            {zones?.map((z) => (
              <div key={z.id}>
                <span>{z.governorate}</span>
                <strong>{money(z.fee)}</strong>
                <button
                  className="icon-button danger"
                  aria-label={`حذف توصيل ${z.governorate}`}
                  onClick={async () => {
                    if (!confirm("إزالة هذه المحافظة من التوصيل؟")) return;
                    try {
                      await api("/merchant/zones/" + z.id, "DELETE");
                      await reload();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <small>
            المنطقة والعنوان تُجمع من الزبون عند الطلب. تكامل شركات التوصيل غير
            مفعّل.
          </small>
        </section>
      </div>
    </>
  );
}
