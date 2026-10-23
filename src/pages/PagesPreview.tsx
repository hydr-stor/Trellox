import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Monitor, Smartphone, Image, Check } from "lucide-react";
import { Logo, ThemeToggle } from "../components/ui";
export default function PagesPreview({
  kind = "auth",
}: {
  kind?: "auth" | "merchant" | "store";
}) {
  const [mobile, setMobile] = useState(true),
    [dark, setDark] = useState(false);
  const merchant = kind !== "store";
  const image = `${import.meta.env.BASE_URL}previews/${merchant ? "merchant" : "store"}-${mobile ? "mobile" : "desktop"}${merchant && mobile && dark ? "-dark" : ""}.png`;
  return (
    <div className="pages-preview">
      <header className="marketing-nav wrap">
        <Logo />
        <div className="nav-actions">
          <ThemeToggle />
          <Link className="button secondary" to="/">
            العودة للموقع <ArrowUpLeft size={17} />
          </Link>
        </div>
      </header>
      <main id="main" className="wrap pages-preview-main">
        <h1>
          {kind === "auth"
            ? "هذه معاينة للواجهات."
            : kind === "merchant"
              ? "مساحة التاجر، عن قرب."
              : "من عين زبونك."}
        </h1>
        <p className="pages-preview-intro">
          {kind === "auth"
            ? "تقدر تستكشف التصميم من هذا الرابط. إنشاء الحساب وإدارة المنتجات والطلبات تحتاج تشغيل خادم التطبيق على Cloudflare Workers."
            : "لقطة من التطبيق المحلي العامل، ببيانات اختبار. الصور المعروضة لا تنشئ طلبات أو تعدّل بيانات."}
        </p>
        <div className="pages-preview-links">
          <Link
            to="/app"
            className={`button ${kind === "merchant" ? "" : "secondary"}`}
          >
            معاينة لوحة التاجر
          </Link>
          <Link
            to="/s/preview"
            className={`button ${kind === "store" ? "" : "secondary"}`}
          >
            معاينة متجر الزبون
          </Link>
          <Link className="text-link" to="/pricing">
            شوف الباقات <ArrowUpLeft size={17} />
          </Link>
        </div>
        <section className="pages-preview-gallery">
          <div className="pages-preview-toolbar">
            <span>
              <Image size={18} />
              معاينة مصوّرة من التطبيق
            </span>
            <div role="group" aria-label="حجم المعاينة">
              <button
                className={mobile ? "selected" : ""}
                onClick={() => setMobile(true)}
                aria-pressed={mobile}
              >
                <Smartphone size={17} />
                موبايل
              </button>
              <button
                className={!mobile ? "selected" : ""}
                onClick={() => setMobile(false)}
                aria-pressed={!mobile}
              >
                <Monitor size={17} />
                حاسوب
              </button>
              {merchant && mobile && (
                <button
                  className={dark ? "selected" : ""}
                  aria-pressed={dark}
                  onClick={() => setDark((v) => !v)}
                >
                  الوضع الداكن
                </button>
              )}
            </div>
          </div>
          <div className={`pages-screen ${mobile ? "phone" : ""}`}>
            <img
              key={image}
              src={image}
              alt={
                merchant
                  ? "لوحة التاجر ببيانات اختبار محلية"
                  : "واجهة متجر تجريبي محلي"
              }
              loading="eager"
            />
          </div>
        </section>
        <p className="pages-preview-footnote">
          <Check size={16} />
          التطبيق الكامل وملفات التشغيل موجودة في المستودع. هذه الاستضافة تعرض
          الواجهات فقط.
        </p>
      </main>
    </div>
  );
}
