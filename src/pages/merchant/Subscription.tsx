import { useState } from "react";

import { Check, Clock, ShieldCheck } from "lucide-react";

import { api, useResource } from "../../api";

import { Alert, Button, Loading, PageTitle } from "../../components/ui";

import { plans } from "../../../shared/brand";

import type { Subscription } from "../../types";

export function SubscriptionPage() {
  const { data, error, loading, reload } = useResource<{
    subscription: Subscription;
    requests: { id: string; plan: "basic" | "plus"; status: string }[];
    capabilities: { products: number };
  }>("/merchant/subscription");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function request(plan: string) {
    setBusy(true);
    setMessage("");
    try {
      const r = await api("/merchant/subscription/request", "POST", { plan });
      setMessage(r.message);
      await reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  return (
    <>
      <PageTitle
        title="مساحة تنمو وياك."
        description="اشتراك واضح، وصلاحيات تُطبق على الخادم."
      />
      {error && <Alert>{error}</Alert>}
      {message && <Alert>{message}</Alert>}
      {data && (
        <>
          <section className="subscription-current">
            <ShieldCheck size={30} />
            <div>
              <h2>{plans[data.subscription.plan].name}</h2>
              <p>
                {data.subscription.status === "trial"
                  ? "الفترة التجريبية"
                  : data.subscription.status === "active"
                    ? "اشتراك مفعّل"
                    : "اشتراك منتهٍ"}{" "}
                · الصلاحية حتى{" "}
                {new Date(
                  data.subscription.expires_at * 1000,
                ).toLocaleDateString("ar-IQ")}
              </p>
            </div>
            <strong>حتى {data.capabilities.products} منتج</strong>
          </section>
          {data.requests.some((r) => r.status === "pending") && (
            <Alert success>
              طلب اشتراكك قيد المراجعة. الباقة لا تتغير قبل التفعيل اليدوي.
            </Alert>
          )}
          <div className="merchant-plans">
            {(["basic", "plus", "delivery"] as const).map((p) => (
              <section className="panel plan" key={p}>
                <h2>{plans[p].name}</h2>
                <p>
                  {p === "basic"
                    ? "إدارة كاملة لأساسيات متجرك."
                    : p === "plus"
                      ? "المتجر مع صلاحية المساعد عند توفر التكامل."
                      : "متجر ومساعد وتوصيل مترابط."}
                </p>
                <strong className="plan-price">
                  {p === "delivery" ? "قريبًا" : "السعر عند التفعيل"}
                </strong>
                <ul>
                  <li>
                    <Check />
                    حتى {plans[p].products} منتج بعد التفعيل
                  </li>
                  <li>
                    <Check />
                    إدارة المنتجات والمخزون والطلبات
                  </li>
                  {p !== "basic" && (
                    <li>
                      <Clock />
                      Instagram غير متصل حاليًا
                    </li>
                  )}
                  {p === "delivery" && (
                    <li>
                      <Clock />
                      لا توجد شركة توصيل مرتبطة
                    </li>
                  )}
                </ul>
                <Button
                  className={p === "basic" ? "" : "secondary"}
                  disabled={
                    p === "delivery" ||
                    data.requests.some((r) => r.status === "pending")
                  }
                  busy={busy}
                  onClick={() => void request(p)}
                >
                  {p === "delivery" ? "غير متاح حاليًا" : "طلب التفعيل"}
                </Button>
              </section>
            ))}
          </div>
          <p className="integration-note">
            لا توجد بوابة دفع مرتبطة. الطلب يسجل للمراجعة فقط ولا يخصم أي مبلغ.
            المساعد وتكامل التوصيل لا يعملان قبل ربط خدمات حقيقية.
          </p>
        </>
      )}
    </>
  );
}
