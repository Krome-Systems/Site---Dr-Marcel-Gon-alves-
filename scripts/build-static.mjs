import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const nextCli = resolve("node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextCli, "build"], {
  env: { ...process.env, STATIC_EXPORT: "1" },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
