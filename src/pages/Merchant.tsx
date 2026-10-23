import { Status } from "../components/OrderStatus";
import { useEffect, useState, useRef } from "react";
import {
  NavLink,
  Link,
  Navigate,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  Wallet,
  ExternalLink,
  LogOut,
  Plus,
  ArrowUpLeft,
  Bell,
  Search,
  Check,
  ArrowLeft,
  Copy,
  PanelRightClose,
  Menu,
  TrendingUp,
  Boxes,
  ClipboardList,
  Flower2,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context";
import { api, useResource } from "../api";
import {
  Logo,
  ThemeToggle,
  Loading,
  Alert,
  Button,
  Empty,
  PageTitle,
} from "../components/ui";
import { brand, money } from "../../shared/brand";
import type { Order } from "../types";
import Products from "./Products";
import { Orders, SettingsPage, SubscriptionPage } from "./MerchantSettings";
const links = [
  { to: "/app", label: "نظرة عامة", icon: LayoutDashboard, end: true },
  { to: "/app/orders", label: "الطلبات", icon: ShoppingBag },
  { to: "/app/products", label: "المنتجات", icon: Package },
  { to: "/app/subscription", label: "الاشتراك", icon: Wallet },
  { to: "/app/settings", label: "إعدادات المتجر", icon: Settings },
];
export default function Merchant() {
  const { profile, loading, refresh } = useAuth(),
    navigate = useNavigate();
  const [menu, setMenu] = useState(false),
    [newOrders, setNewOrders] = useState(0),
    [search, setSearch] = useState(""),
    [logoutError, setLogoutError] = useState("");
  const [smallScreen, setSmallScreen] = useState(
    () => matchMedia("(max-width:700px)").matches,
  );
  const closeMenuRef = useRef<HTMLButtonElement>(null),
    menuTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width:700px)");
    const change = () => setSmallScreen(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (menu && smallScreen) closeMenuRef.current?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu) {
        setMenu(false);
        menuTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu, smallScreen]);
  useEffect(() => {
    if (!profile) return;
    const poll = () => {
      void api<{ stats: { newOrders: number } }>("/merchant/dashboard")
        .then((d) => setNewOrders(d.stats.newOrders))
        .catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 20000);
    return () => clearInterval(timer);
  }, [profile]);
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      await refresh();
      navigate("/login");
    } catch (e) {
      setLogoutError((e as Error).message);
    }
  }
  return (
    <div className="workspace">
      <aside
        className={`sidebar ${menu ? "expanded" : ""}`}
        inert={smallScreen && !menu}
        aria-hidden={smallScreen && !menu}
        onKeyDown={(e) => {
          if (!smallScreen || !menu || e.key !== "Tab") return;
          const controls = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "a[href],button:not([disabled])",
              ),
            ).filter((el) => el.offsetParent !== null),
            first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="sidebar-top">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setMenu(false)}
            aria-label="إغلاق القائمة"
            ref={closeMenuRef}
          >
            <PanelRightClose />
          </button>
        </div>
        <div className="store-identity">
          <span>{profile.store.name.slice(0, 1)}</span>
          <div>
            <strong>{profile.store.name}</strong>
            <small dir="ltr">{profile.store.slug}</small>
          </div>
          <span className="status-dot" />
        </div>
        <nav aria-label="لوحة التاجر">
          {links.map(({ icon: Icon, ...link }) => (
            <NavLink
              key={link.to}
              end={link.end}
              to={link.to}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{link.label}</span>
              {link.to === "/app/orders" && newOrders > 0 && (
                <b className="count">{newOrders}</b>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-trial">
          <span className="trial-leaf">
            <Flower2 size={17} />
          </span>
          <strong>
            {profile.subscription.status === "trial"
              ? "بداية جديدة، فرص أكثر."
              : "مساحتك تنمو وياك."}
          </strong>
          <p>
            {profile.subscription.status === "trial"
              ? `باقي ${Math.max(0, Math.ceil((profile.subscription.expires_at * 1000 - Date.now()) / 86400000))} يوم بتجربتك المجانية.`
              : "راجع اشتراكك وإمكانيات متجرك."}
          </p>
          <Link to="/app/subscription">
            تفاصيل اشتراكي <ArrowUpLeft size={16} />
          </Link>
        </div>
        <Link
          className="sidebar-store"
          to={`/s/${profile.store.slug}`}
          target="_blank"
        >
          زيارة متجري <ExternalLink size={17} />
        </Link>
        <button className="sidebar-link logout" onClick={logout}>
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </aside>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="إغلاق القائمة"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace-main" inert={smallScreen && menu}>
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setMenu(true)}
              ref={menuTriggerRef}
              aria-label="فتح القائمة"
            >
              <Menu />
            </button>
            <span>مساحة العمل</span>
            <span>/</span>
            <strong>{profile.store.name}</strong>
          </div>
          <div className="topbar-actions">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate("/app/products?q=" + encodeURIComponent(search));
              }}
            >
              <Search size={17} />
              <input
                aria-label="البحث عن منتج"
                placeholder="ابحث في منتجاتك…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <ThemeToggle />
            <Link
              className="icon-button notification-button"
              to="/app/orders"
              aria-label={`الطلبات الجديدة: ${newOrders}`}
            >
              <Bell size={20} />
              {newOrders > 0 && <i />}
            </Link>
            <span className="avatar" title={profile.user.name}>
              {profile.user.name.slice(0, 1)}
            </span>
          </div>
        </header>
        <main id="main" className="workspace-content">
          {logoutError && <Alert>{logoutError}</Alert>}
          {!profile.capabilities.commerce && (
            <Alert>
              انتهت صلاحية الاشتراك. يمكنك مراجعة بياناتك وطلب التفعيل من صفحة
              الاشتراك.
            </Alert>
          )}
          <Routes>
            <Route index element={<Overview />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
        <footer className="workspace-footer">
          <span>خطوة بخطوة، تجارتك تكبر.</span>
          <span>{brand.name} / نسخة التطوير الأولى</span>
        </footer>
      </div>
      <nav
        className="mobile-bottom-nav"
        aria-label="التنقل السريع"
        inert={smallScreen && menu}
      >
        {links.slice(0, 3).map(({ icon: Icon, ...link }) => (
          <NavLink end={link.end} to={link.to} key={link.to}>
            <Icon size={21} />
            <span>{link.label}</span>
          </NavLink>
        ))}
        <NavLink to="/app/settings">
          <Settings size={21} />
          <span>الإعدادات</span>
        </NavLink>
      </nav>
    </div>
  );
}
export function Overview() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useResource<{
    stats: {
      products: number;
      orders: number;
      newOrders: number;
      revenue: number;
      lowStock: number;
    };
    recent: Order[];
    activity: { event: string; created_at: number }[];
  }>("/merchant/dashboard");
  const [copied, setCopied] = useState(false);
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <>
        <Alert>{error}</Alert>
        <Button onClick={() => void reload()}>إعادة المحاولة</Button>
      </>
    );
  const s = data.stats;
  const steps = [
    {
      text: "هوية متجرك جاهزة",
      done: !!profile?.store.name,
      to: "/app/settings",
    },
    { text: "أضف أول منتج", done: s.products > 0, to: "/app/products" },
    {
      text: "حدّد سياسة الاستبدال",
      done: (profile?.store.return_policy.length || 0) > 85,
      to: "/app/settings",
    },
    {
      text: "شارك رابطك وابدأ البيع",
      done: s.orders > 0,
      to: `/s/${profile?.store.slug}`,
    },
  ];
  async function share() {
    await navigator.clipboard.writeText(
      `${location.origin}/s/${profile?.store.slug}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <>
      <PageTitle
        title={`يا هلا، ${profile?.user.name.split(" ")[0]}.`}
        description="مساحة مرتّبة لشغلك. هذه صورة متجرك اليوم."
      >
        <Link
          className="button secondary"
          to={`/s/${profile?.store.slug}`}
          target="_blank"
        >
          زيارة المتجر <ExternalLink size={17} />
        </Link>
        <Link className="button" to="/app/products?new=1">
          <Plus size={19} />
          أضف منتج
        </Link>
      </PageTitle>
      <motion.section
        className="welcome-banner"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <span className="banner-chip">
            <span className="status-dot" />
            رابطك جاهز للمشاركة
          </span>
          <h2>
            شغلك الحلو،
            <br />
            يستاهل ينشاف.
          </h2>
          <p>رتّب منتجاتك، شارك الرابط، وخلّي الطلب أسهل.</p>
          <button
            onClick={() => void share().catch(() => setCopied(false))}
            className="banner-link"
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            <span dir="ltr">/s/{profile?.store.slug}</span>
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="arch-panel" />
          <div className="line-arc" />
          <ShoppingBag size={74} strokeWidth={0.75} />
          <span>
            صُنع بشغف.
            <br />
            يُدار بوضوح.
          </span>
        </div>
      </motion.section>
      <section className="metrics" aria-label="إحصائيات المتجر">
        {[
          {
            label: "قيمة الطلبات المكتملة",
            value: money(s.revenue),
            note: "تحسب بعد تأكيد التسليم",
            icon: TrendingUp,
          },
          {
            label: "إجمالي الطلبات",
            value: s.orders,
            note: `${s.newOrders} طلب جديد ينتظرك`,
            icon: ClipboardList,
            Flower2,
          },
          {
            label: "منتجات متجرك",
            value: s.products,
            note: "من قاعدة بيانات متجرك",
            icon: Package,
          },
          {
            label: "مخزون يحتاج انتباه",
            value: s.lowStock,
            note: "أنواع كميتها أقل من ٥",
            icon: Boxes,
          },
        ].map(({ icon: Icon, ...m }) => (
          <div className="metric" key={m.label}>
            <div>
              <span>{m.label}</span>
              <Icon size={19} />
            </div>
            <strong>{m.value}</strong>
            <small>{m.note}</small>
          </div>
        ))}
      </section>
      <div className="overview-grid">
        <section className="panel orders-panel">
          <header className="panel-heading">
            <div>
              <h2>آخر الطلبات</h2>
              <p>كل طلب جديد، بداية علاقة جديدة.</p>
            </div>
            <Link to="/app/orders">
              عرض الكل <ArrowLeft size={16} />
            </Link>
          </header>
          {data.recent.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>الطلب / الزبون</th>
                    <th>المبلغ</th>
                    <th>الحالة</th>
                    <th>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.customer_name}</strong>
                        <small dir="ltr">{o.number}</small>
                      </td>
                      <td>{money(o.total)}</td>
                      <td>
                        <Status status={o.status} />
                      </td>
                      <td>
                        <Link
                          className="icon-button"
                          to={`/app/orders?open=${o.id}`}
                          aria-label={`تفاصيل ${o.number}`}
                        >
                          <ArrowUpLeft size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="أول طلب بالطريق."
              text="أضف منتجاتك وشارك رابط المتجر. طلباتك راح تظهر هنا."
            >
              <Link className="text-link" to="/app/products">
                جهّز منتجاتك <ArrowUpLeft size={17} />
              </Link>
            </Empty>
          )}
        </section>
        <section className="panel setup-panel">
          <header className="panel-heading">
            <div>
              <h2>جهّز مساحتك</h2>
              <p>{steps.filter((s) => s.done).length} من ٤ خطوات مكتملة</p>
            </div>
          </header>
          <div className="setup-progress">
            <span
              style={{ width: `${steps.filter((s) => s.done).length * 25}%` }}
            />
          </div>
          <ul>
            {steps.map((step) => (
              <li key={step.text}>
                <Link to={step.to}>
                  <span className={`step-check ${step.done ? "done" : ""}`}>
                    {step.done ? <Check size={14} /> : null}
                  </span>
                  {step.text}
                  <ArrowUpLeft size={16} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="setup-tip">
            <strong>ابدأ بمنتجك المفضّل.</strong>
            <p>صورة واضحة، وصف بسيط، وسعر صحيح. الباقي يصير أسهل.</p>
          </div>
        </section>
      </div>
      <div className="workspace-note">
        <ShieldNote />
        <span>
          إحصائياتك محسوبة من الطلبات والمنتجات الفعلية، وتتحدّث عند فتح الصفحة.
        </span>
      </div>
    </>
  );
}
function ShieldNote() {
  return <Check size={16} />;
}
