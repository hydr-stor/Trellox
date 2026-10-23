import React, { Suspense, lazy, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";
import "./font.css";
import "./styles.css";
import { AuthProvider } from "./context";
import { brand } from "../shared/brand";
document.title = `${brand.name} — ${brand.tagline}`;
import { Loading } from "./components/ui";
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
      <BrowserRouter>
        <AuthProvider>
          <Scroll />
          <a className="skip-link" href="#main">
            انتقل للمحتوى
          </a>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Marketing />} />
              <Route path="/pricing" element={<Marketing pricing />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth register />} />
              <Route path="/app/*" element={<Merchant />} />
              <Route path="/s/:slug/*" element={<Storefront />} />
              <Route
                path="*"
                element={
                  <main id="main" className="empty">
                    <h1>هذه الصفحة غير موجودة</h1>
                    <a href="/">العودة للرئيسية</a>
                  </main>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
