import { useState, type FormEvent } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ArrowUpLeft, Check, Eye, EyeOff } from "lucide-react";
import { Logo, ThemeToggle, Field, Button, Alert } from "../components/ui";
import { useAuth } from "../context";
import { api } from "../api";
import { brand } from "../../shared/brand";
export default function Auth({ register = false }: { register?: boolean }) {
  const { profile, refresh } = useAuth(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/auth/" + (register ? "register" : "login"), "POST", f);
      await refresh();
      navigate("/app");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (profile) return <Navigate to="/app" replace />;
  return (
    <div className="auth-page">
      <header>
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="auth-layout">
        <section className="auth-form-section">
          <Link to="/" className="back-link">
            العودة للرئيسية <ArrowUpLeft size={17} />
          </Link>
          <h1>{register ? "أهلًا بمشروعك القادم." : "أهلًا برجعتك."}</h1>
          <p>
            {register
              ? "خطوة صغيرة اليوم. مساحة كاملة لتجارتك."
              : "شغلك ينتظرك. خلّينا نكمل من مكان ما وقفنا."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <>
                <Field label="اسمك">
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="شلون نناديك؟"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="اسم المتجر">
                    <input
                      name="storeName"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="اسم يعبّر عنك"
                    />
                  </Field>
                  <Field
                    label="رابط المتجر"
                    hint="حروف إنجليزية، أرقام وشرطة فقط"
                  >
                    <input
                      name="slug"
                      dir="ltr"
                      required
                      pattern="[a-z0-9][a-z0-9-]{2,39}"
                      placeholder="your-store"
                      autoCapitalize="none"
                    />
                  </Field>
                </div>
              </>
            )}
            <Field label="البريد الإلكتروني">
              <input
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </Field>
            <Field
              label="كلمة المرور"
              hint={
                register
                  ? "١٢ حرفًا على الأقل؛ استخدم كلمة مرور فريدة."
                  : undefined
              }
            >
              <div className="password-field">
                <input
                  name="password"
                  type={visible ? "text" : "password"}
                  dir="ltr"
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={12}
                  maxLength={128}
                  required
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setVisible(!visible)}
                  aria-label={
                    visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" busy={busy} className="full">
              {register ? "أنشئ متجري" : "تسجيل الدخول"}
              <ArrowUpLeft size={19} />
            </Button>
            {register && (
              <small className="form-note">
                تبدأ تجربة الباقة الأساسية لمدة ١٤ يومًا. لا يتم خصم أي مبلغ.
              </small>
            )}
          </form>
          <p className="auth-switch">
            {register ? "عندك حساب؟" : "أول مرة هنا؟"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "سجّل دخولك" : "افتح متجرك"}
            </Link>
          </p>
        </section>
        <aside className="auth-story">
          <span className="auth-story-mark">{brand.name}</span>
          <h2>
            فكرتك تستاهل
            <br />
            مساحة تشبهها.
          </h2>
          <p>
            مو بس رابط جديد.
            <br />
            بداية مرتّبة لشغل تكبر بيه.
          </p>
          <div className="auth-story-bottom">
            <span>
              <Check />
              منشأ للعراق
            </span>
            <span>
              <Check />
              الدفع عند الاستلام
            </span>
          </div>
          <div className="auth-arch" />
        </aside>
      </main>
    </div>
  );
}
