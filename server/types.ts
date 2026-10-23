export type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
  ASSETS?: Fetcher;
  APP_ENV: string;
};
export type User = { id: string; name: string; email: string };
export type Store = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  accent: string;
  return_policy: string;
};
export type Subscription = {
  store_id: string;
  plan: "basic" | "plus";
  status: "trial" | "active" | "expired";
  expires_at: number;
};
export type AppEnv = {
  Bindings: Bindings;
  Variables: { user: User; store: Store; subscription: Subscription };
};
