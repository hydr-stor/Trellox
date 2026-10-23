# Phase one plan
User explicitly requested implementation now, using stated stack and local-only safety constraints.
1. Foundations: reproducible npm project, Worker/D1/R2 config, central brand, migration. Verify types and local migration.
2. Identity: registration, session, tenant authorization and throttling. Verify API tests on local real D1.
3. Commerce: products/variants/images/zones, inventory triggers, guest orders and status history. Verify concurrent checkout/idempotency/ownership.
4. Entitlements: server plan limits/expiry; requests with manual local grants only. Verify forbidden capability and coming-soon routes.
5. UI: marketing/auth, merchant workspace, shop/product/cart/confirmation and themes. Verify browser flows at phone/desktop and keyboard/reduced motion.
6. Delivery: tests/build, screenshots, Arabic README, honest phase-two backlog. No deploy, no merge, no external production resource writes.
