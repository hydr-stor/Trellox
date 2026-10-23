import { useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Copy, ArrowUpLeft } from "lucide-react";

import { api, useResource } from "../../api";

import {
  Alert,
  Button,
  Empty,
  Loading,
  PageTitle,
  Sheet,
} from "../../components/ui";

import { useAuth } from "../../context";

import { money, orderStatuses } from "../../../shared/brand";

import type { Order } from "../../types";

import { Status } from "../../components/OrderStatus";

export function Orders() {
  const [params, setParams] = useSearchParams(),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState<string | null>(params.get("open"));
  const { data, error, loading, reload } = useResource<Order[]>(
    "/merchant/orders" + (filter ? "?status=" + filter : ""),
  );
  return (
    <>
      <PageTitle
        title="كل طلب، خطوة لقدّام."
        description="تابع التفاصيل، حدّث الحالة، وجهّز الطلب بثقة."
      >
        <button className="button secondary" onClick={() => void reload()}>
          تحديث الطلبات
        </button>
      </PageTitle>
      <section className="panel">
        <div className="tab-list" role="group" aria-label="تصفية الطلبات">
          {[
            ["", "كل الطلبات"],
            ["new", "جديد"],
            ["preparing", "قيد التجهيز"],
            ["delivered", "مكتمل"],
            ["cancelled", "ملغي"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Alert>{error}</Alert>
        ) : data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>الزبون</th>
                  <th>المحافظة</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o) => (
                  <tr key={o.id}>
                    <td dir="ltr">
                      <strong>{o.number}</strong>
                      <small>
                        {new Date(o.created_at * 1000).toLocaleDateString(
                          "ar-IQ",
                        )}
                      </small>
                    </td>
                    <td>
                      {o.customer_name}
                      <small dir="ltr">{o.phone}</small>
                    </td>
                    <td>{o.governorate}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <Status status={o.status} />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`فتح الطلب ${o.number}`}
                        onClick={() => setSelected(o.id)}
                      >
                        <ArrowUpLeft size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="هنا تبدأ حكاية الطلبات."
            text="طلبات الزبائن تظهر هنا بعد إتمام الشراء من متجرك."
          />
        )}
      </section>
      {selected && (
        <OrderDetail
          id={selected}
          onClose={() => {
            setSelected(null);
            params.delete("open");
            setParams(params, { replace: true });
            void reload();
          }}
        />
      )}
    </>
  );
}

function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { profile } = useAuth(),
    { data, error, loading, reload } = useResource<Order>(
      "/merchant/orders/" + id,
    );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const next: Record<string, string> = {
    new: "confirmed",
    confirmed: "preparing",
    preparing: "shipped",
    shipped: "delivered",
  };
  async function update(status: string) {
    setBusy(true);
    setMessage("");
    try {
      await api(`/merchant/orders/${id}/status`, "PATCH", { status });
      await reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title="تفاصيل الطلب" onClose={onClose}>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <Alert>{error}</Alert>
      ) : (
        <div className="stack-form">
          <div className="order-detail-head">
            <strong dir="ltr">{data.number}</strong>
            <Status status={data.status} />
          </div>
          <section className="receipt-address">
            <h3>{data.customer_name}</h3>
            <a dir="ltr" href={"tel:" + data.phone}>
              {data.phone}
            </a>
            <p>
              {data.governorate}، {data.area}
              <br />
              {data.address}
            </p>
            {data.note && <p>ملاحظة: {data.note}</p>}
          </section>
          <div className="order-lines">
            {data.items?.map((i, n) => (
              <div key={n}>
                <div>
                  <strong>{i.title}</strong>
                  <small>
                    {i.size} / {i.color} × {i.quantity}
                  </small>
                </div>
                <span>{money(i.quantity * i.unit_price)}</span>
              </div>
            ))}
          </div>
          <div className="totals">
            <div>
              <span>المنتجات</span>
              <span>{money(data.subtotal || 0)}</span>
            </div>
            <div>
              <span>التوصيل</span>
              <span>{money(data.delivery_fee || 0)}</span>
            </div>
            <div className="total-line">
              <strong>الإجمالي عند الاستلام</strong>
              <strong>{money(data.total)}</strong>
            </div>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(
                  `${location.origin}/s/${profile?.store.slug}/receipt/${data.receipt_token}`,
                )
                .then(() => setMessage("تم نسخ رابط متابعة الطلب"))
                .catch(() =>
                  setMessage("تعذر النسخ. رابط الطلب ظاهر في صفحة المتجر."),
                )
            }
          >
            <Copy size={17} />
            نسخ رابط متابعة الطلب
          </button>
          <div className="order-timeline">
            <h3>رحلة الطلب</h3>
            {data.history?.map((h, i) => (
              <div key={i}>
                <span className="timeline-dot" />
                <strong>{orderStatuses[h.status]}</strong>
                <small>
                  {new Date(h.created_at * 1000).toLocaleString("ar-IQ")}
                </small>
              </div>
            ))}
          </div>
          {message && <Alert>{message}</Alert>}
          <div className="sheet-footer">
            {next[data.status] && (
              <Button
                busy={busy}
                onClick={() => void update(next[data.status])}
              >
                تحديث إلى {orderStatuses[next[data.status] as Order["status"]]}
              </Button>
            )}
            {["new", "confirmed", "preparing"].includes(data.status) && (
              <Button
                className="danger secondary"
                disabled={busy}
                onClick={() => {
                  if (confirm("إلغاء الطلب وإرجاع الكميات للمخزون؟"))
                    void update("cancelled");
                }}
              >
                إلغاء الطلب
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
