import { useState, useEffect } from "react";

import { Link, useParams } from "react-router-dom";

import { ArrowLeft, Check, Copy } from "lucide-react";

import { useResource } from "../../api";

import { Alert, Button, Loading } from "../../components/ui";

import { money, orderStatuses } from "../../../shared/brand";

import type { Order } from "../../types";

function StatusLocal({ status }: { status: Order["status"] }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {orderStatuses[status]}
    </span>
  );
}
export default function Receipt({
  base,
  slug,
}: {
  base: string;
  slug: string;
}) {
  const { token } = useParams(),
    { data, error, loading, reload } = useResource<Order>(
      `/shops/${slug}/receipts/${token}`,
    );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => void reload(), 20000);
    return () => clearInterval(timer);
  }, [reload]);
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <div className="wrap">
        <Alert>{error}</Alert>
      </div>
    );
  return (
    <section className="receipt-page wrap">
      <div className="receipt-check">
        <Check size={35} />
      </div>
      <h1>وصلنا طلبك.</h1>
      <p>شكرًا لاختيارك. المتجر راح يتابع تجهيز طلبك.</p>
      <div className="receipt-card">
        <span>رقم طلبك</span>
        <strong dir="ltr">{data.number}</strong>
        <StatusLocal status={data.status} />
        <div className="order-lines">
          {data.items?.map((i, n) => (
            <div key={n}>
              <span>
                {i.title} × {i.quantity}
              </span>
              <strong>{money(i.unit_price * i.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="total-line">
          <span>الإجمالي عند الاستلام، شامل التوصيل</span>
          <strong>{money(data.total)}</strong>
        </div>
        <small>
          احتفظ برابط هذه الصفحة لمتابعة حالة الطلب. لا تشاركه إلا مع الشخص
          المعني.
        </small>
      </div>
      {copyError && <Alert>{copyError}</Alert>}
      <div className="hero-actions">
        <Button
          className="secondary"
          onClick={() => {if(!navigator.clipboard){setCopyError('انسخ رابط الطلب من شريط العنوان.');return;}void navigator.clipboard.writeText(location.href).then(()=>setCopied(true)).catch(()=>setCopyError('انسخ رابط الطلب من شريط العنوان.'));}}
        >
          <Copy size={17} />
          {copied ? "تم نسخ الرابط" : "احفظ رابط الطلب"}
        </Button>
        <Link to={base} className="button">
          العودة للمتجر <ArrowLeft size={17} />
        </Link>
      </div>
    </section>
  );
}
