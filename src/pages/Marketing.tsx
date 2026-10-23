import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  Instagram,
  LayoutGrid,
  Package,
  ShoppingBag,
  Truck,
  Menu,
  X,
  ShieldCheck,
  MapPin,
  Plus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Logo, ThemeToggle, Reveal, Arrow } from "../components/ui";
import { brand, plans } from "../../shared/brand";
function Navigation() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="marketing-nav wrap" aria-label="التنقل الرئيسي">
      <Logo />
      <div className={`nav-links ${open ? "open" : ""}`}>
        <Link to="/#experience" onClick={() => setOpen(false)}>
          التجربة
        </Link>
        <Link to="/#features" onClick={() => setOpen(false)}>
          كل ما تحتاجه
        </Link>
        <Link to="/pricing" onClick={() => setOpen(false)}>
          الاشتراكات
        </Link>
      </div>
      <div className="nav-actions">
        <ThemeToggle />
        <Link className="login-link" to="/login">
          تسجيل الدخول
        </Link>
        <Link className="button small" to="/register">
          ابدأ متجرك <Arrow />
        </Link>
        <button
          className="icon-button mobile-only"
          onClick={() => setOpen(!open)}
          aria-label="القائمة"
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </nav>
  );
}
function Plans() {
  return (
    <section className="pricing-section wrap" id="pricing">
      <Reveal className="section-heading">
        <h2>
          مساحة تناسب
          <br />
          <span>المرحلة اللي وصلت إلها.</span>
        </h2>
        <p>
          ابدأ بتجربة المتجر ١٤ يومًا. بدون بطاقة دفع.
          <br />
          التفعيل المدفوع يدوي بعد مراجعة طلبك.
        </p>
      </Reveal>
      <div className="pricing-grid">
        {(["basic", "plus", "delivery"] as const).map((p, i) => (
          <Reveal key={p} className={`plan ${i === 0 ? "featured" : ""}`}>
            <div className="plan-top">
              <span>
                {p === "basic"
                  ? "البداية الصحيحة"
                  : p === "plus"
                    ? "لما تكبر أسئلتهم"
                    : "الخطوة القادمة"}
              </span>
              {p === "delivery" && <span className="badge">قريبًا</span>}
            </div>
            <h3>{plans[p].name}</h3>
            <p>
              {p === "basic"
                ? "من أول منتج، إلى طلبك القادم."
                : p === "plus"
                  ? "متجرك، مع مساحة لمساعد Instagram."
                  : "رحلة طلب مترابطة حتى باب الزبون."}
            </p>
            <div className="plan-price">
              {p === "delivery" ? "قيد التطوير" : "السعر عند التفعيل"}
              <small>
                {p === "basic"
                  ? "تجربة مجانية لمدة ١٤ يومًا"
                  : p === "plus"
                    ? "المساعد غير مفعّل حاليًا"
                    : "يتطلب تكامل شركة توصيل حقيقية"}
              </small>
            </div>
            <ul>
              <li>
                <Check />
                متجر برابط خاص وهوية مستقلة
              </li>
              <li>
                <Check />
                منتجات ومخزون وطلبات
              </li>
              <li>
                <Check />
                الدفع عند الاستلام
              </li>
              {p !== "basic" && (
                <li>
                  <Plus />
                  مساعد Instagram — غير متصل بعد
                </li>
              )}
              {p === "delivery" && (
                <li>
                  <Truck />
                  تكامل التوصيل — غير متاح بعد
                </li>
              )}
            </ul>
            {p === "basic" ? (
              <Link to="/register" className="button">
                ابدأ التجربة <Arrow />
              </Link>
            ) : p === "plus" ? (
              <Link className="button secondary" to="/register">
                ابدأ بالمتجر الأساسي
              </Link>
            ) : (
              <button disabled className="button secondary">
                قريبًا
              </button>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
export default function Marketing({ pricing = false }: { pricing?: boolean }) {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const section = document.getElementById(hash.slice(1));
      section?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  }, [hash, pricing]);
  return (
    <div className="marketing">
      <Navigation />
      <main id="main">
        {pricing ? (
          <section className="pricing-intro wrap">
            <h1>
              ابدأ صغير.
              <br />
              <em>وابنِ على راحتك.</em>
            </h1>
            <p>باقات واضحة، وتكاملات تظهر عندما تعمل فعلًا.</p>
          </section>
        ) : (
          <>
            <section className="hero wrap">
              <Reveal className="hero-copy">
                <h1>
                  شغفك بالتجارة.
                  <br />
                  <span>إله مساحة أكبر.</span>
                </h1>
                <p>
                  من رسائل متفرّقة إلى متجر يجمع شغلك.
                  <br />
                  منتجاتك، طلباتك، وزبائنك… كلّها بمكان واحد.
                </p>
                <div className="hero-actions">
                  <Link to="/register" className="button large">
                    افتح متجرك <ArrowUpLeft size={21} />
                  </Link>
                  <Link to="/#experience" className="text-link">
                    شوف شلون يشتغل <ArrowLeft size={18} />
                  </Link>
                </div>
                <div className="hero-assurance">
                  <span>
                    <Check />
                    تجربة ١٤ يوم مجانًا
                  </span>
                  <span>
                    <Check />
                    بدون بطاقة دفع
                  </span>
                  <span>
                    <Check />
                    مصمم للعراق
                  </span>
                </div>
              </Reveal>
              <Reveal className="hero-stage">
                <div className="stage-orbit" />
                <div className="stage-word">
                  من عندك،
                  <br />
                  إلى كل مكان.
                </div>
                <div className="store-preview">
                  <div className="preview-browser">
                    <span />
                    <span />
                    <span />
                    <small dir="ltr">your-store.{brand.latin}</small>
                  </div>
                  <div className="preview-body">
                    <div className="preview-brand">
                      <span>دار</span>
                      <ShoppingBag size={18} />
                    </div>
                    <p className="preview-caption">
                      أشياء بسيطة، تختارها بعناية.
                    </p>
                    <div className="preview-photo">
                      <div className="display-block block-one" />
                      <div className="display-block block-two" />
                      <div className="display-ring" />
                      <span>
                        كل قطعة،
                        <br />
                        تحچي حكاية.
                      </span>
                    </div>
                    <div className="preview-bottom">
                      <span>مجموعتك الجديدة</span>
                      <ArrowUpLeft size={17} />
                    </div>
                  </div>
                </div>
                <div className="stage-label">
                  <span className="status-dot" />
                  منشورك يصير بداية طلب.
                </div>
                <div className="stage-note">
                  <Package size={20} />
                  <div>
                    <strong>تفاصيل واضحة. طلب أسهل.</strong>
                    <small>من الاختيار إلى الدفع عند الاستلام</small>
                  </div>
                </div>
                <small className="example-label">
                  تصوّر توضيحي لمتجر، وليس بيانات مبيعات
                </small>
              </Reveal>
            </section>
            <section className="value-strip">
              <div className="wrap">
                <span>
                  <Instagram />
                  من Instagram إلى متجرك
                </span>
                <span>
                  <MapPin />
                  محافظات العراق، بأجورك
                </span>
                <span>
                  <ShieldCheck />
                  مساحة خاصة لتجارتك
                </span>
              </div>
            </section>
            <section id="experience" className="experience-section wrap">
              <Reveal className="section-heading">
                <h2>
                  خفّف تفاصيل اليوم.
                  <br />
                  <span>وركّز على اللي تحبّه.</span>
                </h2>
                <p>
                  تجربة مصممة لصاحب المتجر، مو للمبرمج.
                  <br />
                  تبدأ بخطوة بسيطة، وترتّب الباقي وياك.
                </p>
              </Reveal>
              <div className="feature-editorial">
                <Reveal className="feature-visual">
                  <div className="mini-workspace">
                    <header>
                      <span className="mini-logo">ر</span>
                      <span>مساحتك، مرتّبة.</span>
                      <LayoutGrid size={18} />
                    </header>
                    <div className="mini-order">
                      <div>
                        <span>صورة أوضح عن شغلك</span>
                        <h3>
                          كل طلب،
                          <br />
                          بمكانه الصحيح.
                        </h3>
                      </div>
                      <div className="mini-order-lines">
                        <span>
                          <i />
                          جديد <b>←</b>
                        </span>
                        <span>
                          <i />
                          قيد التجهيز <b>←</b>
                        </span>
                        <span>
                          <i />
                          تم التوصيل <Check size={16} />
                        </span>
                      </div>
                    </div>
                    <footer>تتبّع الحالة من أول طلب إلى آخر خطوة.</footer>
                  </div>
                </Reveal>
                <Reveal className="feature-copy">
                  <span className="feature-icon">
                    <Package />
                  </span>
                  <h3>
                    الرسائل للحديث.
                    <br />
                    والمتجر للطلبات.
                  </h3>
                  <p>
                    خلي زبونك يشوف الخيارات، يختار المقاس واللون، ويطلب بدون
                    حساب. وتوصلك التفاصيل مرتّبة، بدون سؤال ناقص.
                  </p>
                  <Link to="/register" className="text-link">
                    جرّبها بنفسك <Arrow />
                  </Link>
                </Reveal>
              </div>
            </section>
            <section className="features-section wrap" id="features">
              <Reveal className="section-heading">
                <h2>
                  شغلك كلّه.
                  <br />
                  <span>بتفاصيل مدروسة.</span>
                </h2>
                <p>
                  ثلاث مساحات مترابطة، لتجربة أبسط
                  <br />
                  من طرفك وطرف الزبون.
                </p>
              </Reveal>
              <div className="feature-rows">
                {[
                  {
                    icon: ShoppingBag,
                    title: "متجر يحمل اسمك",
                    text: "رابط خاص، صور منتجاتك، وتصنيفات تخلي الاختيار أسهل.",
                    tag: "واجهة الزبون",
                  },
                  {
                    icon: LayoutGrid,
                    title: "كل شيء تحت نظرك",
                    text: "مخزون لكل مقاس ولون، طلبات بحالات واضحة، وأرقام من بياناتك.",
                    tag: "لوحة التاجر",
                  },
                  {
                    icon: Truck,
                    title: "التوصيل على طريقتك",
                    text: "حدّد المحافظات وأجور التوصيل. تكامل الشركات يجي بمرحلته.",
                    tag: "إدارة محلية",
                  },
                ].map(({ icon: Icon, ...f }) => (
                  <Reveal className="feature-row" key={f.title}>
                    <span className="feature-icon">
                      <Icon />
                    </span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                    <span className="feature-tag">{f.tag}</span>
                  </Reveal>
                ))}
              </div>
            </section>
          </>
        )}
        <Plans />
        <section className="closing-section wrap">
          <Reveal>
            <h2>
              متجرك القادم،
              <br />
              يبدأ من هنا.
            </h2>
            <Link to="/register" className="button peach large">
              خلّينا نبدأ <Arrow />
            </Link>
          </Reveal>
          <span className="closing-mark" aria-hidden="true">
            ر
          </span>
        </section>
      </main>
      <footer className="site-footer wrap">
        <Logo />
        <p>{brand.tagline} — منصّة قيد البناء، بهوية مؤقتة.</p>
        <Link to="/login">
          دخول التجار <ArrowUpLeft size={15} />
        </Link>
      </footer>
    </div>
  );
}
