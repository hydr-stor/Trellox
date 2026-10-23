# Phase-one verification — 2026-10-23 UTC

- `npm test`: 18/18 passed on the final dependency graph, using real local Workerd + D1 + R2 through Miniflare.
- `npm run build`: TypeScript, Vite, and Worker bundle dry-run passed. No deployment executed.
- `npm run test:browser`: registration → product/image/variant → guest cart/checkout → confirmation → merchant order/status → pending subscription request passed. No uncaught page errors.
- `npm run test:boundaries`: no page overflow at 320/375px and landscape for marketing/auth/shop/merchant; mobile sidebar Escape/inert and native sheet Escape passed. Complete screenshots at 390 and 1440px include light/dark and reduced-motion.
- `npm audit` (all dependencies): zero known advisories after patching the stable local Miniflare dependency tree. `npm audit --omit=dev` also zero.
- Opt-in local seed uses D1-derived metrics and fictional customers/orders; photo is AI-generated. Screenshots are local fixture evidence, not real business activity.
- No production Cloudflare resources, no production secrets, no application deployment, no production merge.

Limits: Chromium emulation is not an actual iPhone/Safari test; network/edge load and production KDF performance are not certified. No operational payment/Instagram/courier API. Full production gates are in phase-two.md.
