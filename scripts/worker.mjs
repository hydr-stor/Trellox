import { spawn } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const args = process.argv.slice(2);
// Every repository script is deliberately local or a dry-run. No deployment command.
const allowed =
  (args[0] === "dev" && args.includes("--local")) ||
  (args[0] === "d1" && args.includes("--local")) ||
  (args[0] === "deploy" && args.includes("--dry-run"));
if (!allowed || args.includes("--remote"))
  throw new Error(
    "Use an explicit local command or dry-run. Production deployment is not configured.",
  );
// Vite serves the UI in dev; Wrangler still needs its local asset directory on a fresh clone.
if (args[0] === "dev") {
  mkdirSync(resolve("dist/client"), { recursive: true });
  const index = resolve("dist/client/index.html");
  if (!existsSync(index))
    writeFileSync(
      index,
      '<!doctype html><html lang="ar" dir="rtl"><title>التطوير المحلي</title><p>افتح واجهة التطوير على http://localhost:5173</p></html>',
    );
}
const config = resolve(".wrangler/config");
mkdirSync(config, { recursive: true });
const child = spawn(
  process.execPath,
  ["node_modules/wrangler/bin/wrangler.js", ...args],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: config,
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
