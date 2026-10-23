export type Variant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
};
export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_price: number | null;
  image: string | null;
  category_id: string | null;
  category_name?: string;
  active?: number;
  variants: Variant[];
};
export type Store = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  return_policy: string;
  accent: string;
};
export type Subscription = {
  plan: "basic" | "plus";
  status: "trial" | "active" | "expired";
  expires_at: number;
};
export type Profile = {
  user: { name: string; email: string };
  store: Store;
  subscription: Subscription;
  capabilities: { commerce: boolean; products: number; instagram: boolean };
};
export type Order = {
  id: string;
  number: string;
  customer_name: string;
  phone: string;
  governorate: string;
  total: number;
  status:
    "new" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
  created_at: number;
  receipt_token?: string;
  area?: string;
  address?: string;
  note?: string;
  subtotal?: number;
  delivery_fee?: number;
  items?: {
    title: string;
    size: string;
    color: string;
    unit_price: number;
    quantity: number;
  }[];
  history?: { status: Order["status"]; created_at: number }[];
};
export type ShopData = {
  store: Store;
  available: boolean;
  products: Product[];
  categories: { id: string; name: string }[];
  zones: { governorate: string; fee: number }[];
};
