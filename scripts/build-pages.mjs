import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
const build = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--mode", "pages"],
  { stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
mkdirSync("dist/pages/previews", { recursive: true });
for (const name of [
  "merchant-desktop",
  "merchant-mobile",
  "merchant-mobile-dark",
  "store-desktop",
  "store-mobile",
])
  cpSync(`docs/previews/${name}.png`, `dist/pages/previews/${name}.png`);
writeFileSync("dist/pages/.nojekyll", "");
const index = "dist/pages/index.html";
writeFileSync(
  index,
  readFileSync(index, "utf8").replace(
    "</head>",
    '<meta name="robots" content="noindex,nofollow" /><meta name="app-mode" content="pages-preview" /></head>',
  ),
);
console.log(
  "Built a static Pages preview. No Worker, database or API credentials are deployed.",
);
