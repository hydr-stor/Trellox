import React, { Suspense, lazy, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  HashRouter,
  Link,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { MotionConfig } from "motion/react";
import "./font.css";
import "./styles.css";
import { AuthProvider } from "./context";
import { brand } from "../shared/brand";
document.title = `${brand.name} — ${brand.tagline}`;
import { Loading } from "./components/ui";
import { isStaticPreview } from "./build-mode";
const Router = isStaticPreview ? HashRouter : BrowserRouter;
const PagesPreview = lazy(() => import("./pages/PagesPreview"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Auth = lazy(() => import("./pages/Auth"));
const Merchant = lazy(() => import("./pages/Merchant"));
const Storefront = lazy(() => import("./pages/Storefront"));
function Scroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        {isStaticPreview && (
          <div className="pages-preview-strip">
            معاينة الواجهات فقط — التسجيل والطلبات تحتاج خادم التطبيق.
            <Link to="/app">
              شوف لوحة التاجر <span aria-hidden="true">←</span>
            </Link>
          </div>
        )}
        <AuthProvider>
          <Scroll />
          <a className="skip-link" href="#main">
            انتقل للمحتوى
          </a>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Marketing />} />
              <Route path="/pricing" element={<Marketing pricing />} />
              <Route
                path="/login"
                element={isStaticPreview ? <PagesPreview /> : <Auth />}
              />
              <Route
                path="/register"
                element={isStaticPreview ? <PagesPreview /> : <Auth register />}
              />
              <Route
                path="/app/*"
                element={
                  isStaticPreview ? (
                    <PagesPreview kind="merchant" />
                  ) : (
                    <Merchant />
                  )
                }
              />
              <Route
                path="/s/:slug/*"
                element={
                  isStaticPreview ? (
                    <PagesPreview kind="store" />
                  ) : (
                    <Storefront />
                  )
                }
              />
              <Route
                path="*"
                element={
                  <main id="main" className="empty">
                    <h1>هذه الصفحة غير موجودة</h1>
                    <Link to="/">العودة للرئيسية</Link>
                  </main>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
