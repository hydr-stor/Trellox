# رِواق — Phase one design

Independent, local-first Iraqi commerce SaaS. This repository contains only new product code. Temporary branding is centralized in shared/brand.ts. No production resource credentials, IDs, or connections; no deployment.

## Decisions
Single React/Vite SPA with route boundaries: / (marketing), /pricing, /login, /register, /app/* (merchant), /s/:slug/* (public store). Hono Worker provides /api; same-origin cookies, local Vite proxy to Wrangler. D1 SQL migrations; R2 local product images. Self-host Arabic font. Prices integer IQD (no decimals).

Alternative SSR/full framework would improve initial SEO but adds unnecessary runtime complexity for phase one; static marketing + client store routing is chosen, with prerender/SEO in phase two. Separate deployed apps can follow after boundaries are proven; one local deployment reduces auth/CORS risk now.

## Working vertical slice
Register owner + unique store + 14-day basic trial atomically; secure hashed opaque sessions; login/logout/me; merchant updates store and delivery regions; categories; products with one or more size/color variants, independent stock and integer prices/optional compare-at price; R2 upload; public catalogue, product details, persistent per-store cart; guest COD order with validated Iraqi address and server prices; idempotency bound to payload and store; atomic SQL triggers reserve stock and reject unavailable/expired-store orders. Order status history and cancellation stock restoration are transactional. Dashboard derives counts and totals from SQL; no fabricated production statistics. Merchant new-order polling provides honest in-app notifications, not push.

## Subscriptions
Server capability lookup on every gated write. Trial basic limit 30 products, expires in 14 days. Active basic 100 products; plus 500. New customers cannot self-grant paid access: plan-change requests persist pending review. Operator local CLI can explicitly grant a plan for testing; no public admin/grant endpoint. Delivery plan listed coming soon, cannot request/grant. Instagram connector is unconfigured: never presents fake AI replies; capability plus connector readiness both required. Prices unconfirmed: pricing says manual quote, not invented commercial rates.

## Data and security
users, sessions, stores, categories, products, variants, orders, order_items, order_history, delivery_zones, subscriptions, subscription_requests, audit_events, auth_attempts. Every merchant query scopes store derived from session owner, never trusted client tenant IDs. HttpOnly SameSite=Lax cookies, Secure outside local; scrypt password KDF with unique salt; session token SHA256 in DB, expiry + logout revocation. Origin checks for mutations, application/json validation, strict request schemas, upload size/magic checks. Shared D1-backed auth throttling. No CORS wildcard, CSP/security headers. Checkout request idempotency and serialized D1 batch/SQL trigger invariants prevent oversell. Checkout receipts use high-entropy token; no public sequential order enumeration. Minimal PII with documented retention and prelaunch privacy work.

## UI contract
Arabic RTL, ivory page / white surface / deep forest ink / restrained peach accents. Original editorial marketing composition with typographic headline and honest example store preview; no fake customers/revenue/reviews. Merchant workspace: narrow right sidebar, working top search, actionable empty states, key SQL metrics, recent orders and setup checklist. Public store: product photos lead, compact filters, readable pricing, explicit unavailable variants. Small-screen merchant bottom navigation; native modal dialogs behave as bottom sheets; native keyboard focus and escape. Light default + explicit dark theme; spring nav and subtle entrance respecting reduced motion. No heavy 3D. No external font/API dependency at runtime. Real local demo data is opt-in and labelled; screenshots may use that local fixture.

## Phase boundary
Phase one is a runnable verified product/stock/order/subscription foundation, not a launch-ready SaaS. Defer actual billing, Instagram OAuth/AI, courier APIs, transactional email/reset verification, full customer privacy export/retention tools, production monitoring, custom domains and advanced analytics. No production launch until those gates and external provider approvals. Tests cover auth, ownership, entitlements, inventory races, duplicate order semantics, cancellation, uploads and browser critical flows.
