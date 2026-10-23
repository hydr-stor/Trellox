import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const [slug, plan, days = "30"] = process.argv.slice(2);
if (
  !/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug || "") ||
  !["basic", "plus"].includes(plan) ||
  !/^\d{1,3}$/.test(days) ||
  Number(days) < 1
)
  throw new Error(
    "Usage: npm run subscription:grant -- <store-slug> <basic|plus> <days:1-999>",
  );
mkdirSync(".wrangler", { recursive: true });
const sql = `UPDATE subscriptions SET plan='${plan}',status='active',expires_at=unixepoch()+${Number(days) * 86400},updated_at=unixepoch() WHERE store_id=(SELECT id FROM stores WHERE slug='${slug}'); UPDATE subscription_requests SET status='approved' WHERE store_id=(SELECT id FROM stores WHERE slug='${slug}') AND status='pending' AND plan='${plan}'; INSERT INTO audit_events(id,store_id,event,resource_id) SELECT lower(hex(randomblob(16))),id,'subscription.local_grant',id FROM stores WHERE slug='${slug}';`;
writeFileSync(".wrangler/local-grant.sql", sql);
const r = spawnSync(
  process.execPath,
  [
    "scripts/worker.mjs",
    "d1",
    "execute",
    "DB",
    "--local",
    "--file",
    ".wrangler/local-grant.sql",
  ],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
