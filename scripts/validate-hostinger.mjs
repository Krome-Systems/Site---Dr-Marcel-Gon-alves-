import { readFile, access } from "node:fs/promises";

const checks = [];

function check(label, condition, detail) {
  checks.push({ label, ok: Boolean(condition), detail });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const envExample = await readFile(".env.example", "utf8");
const [healthRoute, lockfile] = await Promise.all([
  fileExists("app/api/health/route.ts"),
  fileExists("pnpm-lock.yaml"),
]);

const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const supportedNode = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 13);

check("Node.js 22.13+", supportedNode, process.versions.node);
check("Gerenciador pnpm declarado", packageJson.packageManager?.startsWith("pnpm@"), packageJson.packageManager ?? "ausente");
check("Comando de build", packageJson.scripts?.build === "next build", packageJson.scripts?.build ?? "ausente");
check("Comando de start", packageJson.scripts?.start === "next start", packageJson.scripts?.start ?? "ausente");
check("Lockfile do pnpm", lockfile, "pnpm-lock.yaml");
check("Endpoint de saúde", healthRoute, "app/api/health/route.ts");
check("URL pública documentada", envExample.includes("NEXT_PUBLIC_SITE_URL="), "NEXT_PUBLIC_SITE_URL");
check("WhatsApp documentado", envExample.includes("NEXT_PUBLIC_WHATSAPP_NUMBER="), "NEXT_PUBLIC_WHATSAPP_NUMBER");
check("Banco documentado", envExample.includes("DATABASE_URL="), "DATABASE_URL");

for (const item of checks) {
  console.log(`${item.ok ? "✓" : "✗"} ${item.label}: ${item.detail}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nValidação da Hostinger falhou em ${failed.length} item(ns).`);
  process.exit(1);
}

console.log("\nConfiguração estrutural pronta para validação na Hostinger.");
