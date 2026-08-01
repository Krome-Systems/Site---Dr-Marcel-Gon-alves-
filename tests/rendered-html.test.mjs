import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the institutional content and clinical safeguards", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Diagnóstico cuidadoso/);
  assert.match(page, /não é um diagnóstico/);
  assert.match(page, /18 grupos de sinais/);
  assert.match(page, /antes dos 12 anos/);
  assert.match(page, /GAD‑7/);
  assert.match(page, /CVV 188/);
  assert.match(page, /NEXT_PUBLIC_WHATSAPP_NUMBER/);
  assert.match(layout, /Instituto Dr\. Marcel Gonçalves/);
  assert.match(layout, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});

test("uses the Hostinger-compatible Next.js runtime", async () => {
  const [packageJson, nextConfig, healthRoute, db] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"build": "next build"/);
  assert.match(packageJson, /"start": "next start"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);
  assert.match(nextConfig, /poweredByHeader: false/);
  assert.match(healthRoute, /status: "ok"/);
  assert.match(db, /drizzle-orm\/mysql2/);
  assert.doesNotMatch(db, /cloudflare:workers|D1/);
});
