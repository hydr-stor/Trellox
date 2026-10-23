import { useState, useEffect } from "react";

import { Link, useParams, Routes, Route } from "react-router-dom";

import { ShoppingBag, ArrowLeft } from "lucide-react";

import { useResource } from "../api";

import { Alert, Button, Empty, Loading, ThemeToggle } from "../components/ui";

import { brand } from "../../shared/brand";

import type { ShopData } from "../types";
import { type CartLine, readCart } from "./shop/model";
import Catalogue from "./shop/Catalogue";
import ProductPage from "./shop/ProductPage";
import CartPage from "./shop/CartPage";
import Checkout from "./shop/Checkout";
import Receipt from "./shop/Receipt";

export default function Storefront() {
  const { slug } = useParams(),
    { data, error, loading, reload } = useResource<ShopData>("/shops/" + slug);
  const key = `riwaq-cart-${slug}`;
  const [cart, setCart] = useState<CartLine[]>(() => readCart(key));
  useEffect(() => {
    setCart(readCart(key));
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(cart));
  }, [cart, key]);
  function add(variant_id: string, quantity: number) {
    setCart((rows) => {
      const found = rows.find((r) => r.variant_id === variant_id);
      return found
        ? rows.map((r) =>
            r.variant_id === variant_id
              ? { ...r, quantity: Math.min(100, r.quantity + quantity) }
              : r,
          )
        : [...rows, { variant_id, quantity }];
    });
  }
  function quantity(id: string, n: number) {
    setCart((rows) =>
      n > 0
        ? rows.map((r) =>
            r.variant_id === id ? { ...r, quantity: Math.min(100, n) } : r,
          )
        : rows.filter((r) => r.variant_id !== id),
    );
  }
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <main id="main" className="wrap">
        <Empty title="ما گدرنا نفتح المتجر." text={error || "جرّب مرة ثانية."}>
          <Button onClick={() => void reload()}>إعادة المحاولة</Button>
        </Empty>
      </main>
    );
  const count = cart.reduce((n, r) => n + r.quantity, 0),
    base = `/s/${slug}`;
  return (
    <div className="storefront">
      <div className="shop-announcement">
        اختيارات قريبة لقلبك. والدفع، عند الاستلام.
      </div>
      <header className="shop-nav wrap">
        <Link className="shop-brand" to={base}>
          {data.store.logo ? (
            <img src={data.store.logo} alt="" />
          ) : (
            <span className="shop-monogram">{data.store.name.slice(0, 1)}</span>
          )}
          <strong>{data.store.name}</strong>
        </Link>
        <nav aria-label="المتجر">
          <Link to={base}>كل المنتجات</Link>
          <a href="#policy">الاستبدال والإرجاع</a>
        </nav>
        <div className="shop-nav-actions">
          <ThemeToggle />
          <Link
            className="cart-icon"
            to={base + "/cart"}
            aria-label={`سلة التسوق: ${count} قطعة`}
          >
            <ShoppingBag size={22} />
            <span>{count}</span>
          </Link>
        </div>
      </header>
      <main id="main">
        {!data.available && (
          <div className="wrap">
            <Alert>
              المتجر لا يستقبل طلبات جديدة حاليًا. تقدر تتصفح المنتجات.
            </Alert>
          </div>
        )}
        <Routes>
          <Route index element={<Catalogue data={data} base={base} />} />
          <Route
            path="p/:productId"
            element={<ProductPage data={data} base={base} add={add} />}
          />
          <Route
            path="cart"
            element={
              <CartPage
                data={data}
                base={base}
                cart={cart}
                quantity={quantity}
              />
            }
          />
          <Route
            path="checkout"
            element={
              <Checkout
                data={data}
                base={base}
                cart={cart}
                clear={() => {
                  setCart([]);
                  void reload();
                }}
              />
            }
          />
          <Route
            path="receipt/:token"
            element={<Receipt base={base} slug={slug!} />}
          />
          <Route
            path="*"
            element={
              <Empty
                title="الصفحة غير موجودة"
                text="ارجع للمتجر واكتشف المنتجات."
              >
                <Link to={base}>العودة للمتجر</Link>
              </Empty>
            }
          />
        </Routes>
      </main>
      <footer className="shop-footer wrap" id="policy">
        <div>
          <h2>{data.store.name}</h2>
          <p>{data.store.description || "اختيارات من متجرنا، إلى بابك."}</p>
        </div>
        <div>
          <h3>الاستبدال والإرجاع</h3>
          <p>{data.store.return_policy}</p>
        </div>
        <Link className="powered-by" to="/">
          مساحة تجارة على {brand.name} <ArrowUpLeftSmall />
        </Link>
      </footer>
    </div>
  );
}

function ArrowUpLeftSmall() {
  return <ArrowLeft size={16} />;
}
