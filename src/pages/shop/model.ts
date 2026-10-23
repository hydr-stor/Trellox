import type { ShopData } from "../../types";
export type CartLine = { variant_id: string; quantity: number };
export function readCart(key: string): CartLine[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (v) =>
              typeof v.variant_id === "string" &&
              Number.isInteger(v.quantity) &&
              v.quantity > 0 &&
              v.quantity <= 100,
          )
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export function cartProducts(data: ShopData, cart: CartLine[]) {
  return cart.map((line) => {
    const product = data.products.find((p) =>
      p.variants.some((v) => v.id === line.variant_id),
    );
    const variant = product?.variants.find((v) => v.id === line.variant_id);
    return { line, product, variant };
  });
}
