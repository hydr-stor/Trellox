import { spawn } from "node:child_process";
const processes = ["dev:api", "dev:web"].map((s) =>
  spawn("npm", ["run", s], { stdio: "inherit" }),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const p of processes) p.kill(signal);
    process.exit(0);
  });
