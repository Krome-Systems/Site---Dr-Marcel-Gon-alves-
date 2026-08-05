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
  assert.match(page, /PHQ‑9/);
  assert.match(page, /estrutura do MDQ/);
  assert.match(page, /Este resultado não é um diagnóstico/);
  assert.match(page, /CVV 188/);
  assert.match(page, /Baixar resumo em PDF/);
  assert.match(page, /Enviar resumo/);
  assert.match(page, /Não é necessário criar conta/);
  assert.match(page, /site não armazena minhas respostas/);
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

test("lets the Netlify OpenNext adapter configure the publish output", async () => {
  const netlify = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");

  assert.match(netlify, /NODE_VERSION = "22\.22\.0"/);
  assert.doesNotMatch(netlify, /publish\s*=/);
  assert.doesNotMatch(netlify, /command\s*=/);
});

test("provides an isolated static preview build", async () => {
  const [packageJson, nextConfig, staticBuilder] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"build:static": "node scripts\/build-static\.mjs"/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(staticBuilder, /STATIC_EXPORT: "1"/);
});

test("keeps email credentials on the server and validates the delivery route", async () => {
  const [page, route, envExample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/send-result/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /RESEND_API_KEY/);
  assert.match(route, /process\.env\.RESEND_API_KEY/);
  assert.match(route, /requestOriginIsAllowed/);
  assert.match(route, /rateLimitAllows/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /"User-Agent": "instituto-dr-marcel\/1\.0"/);
  assert.match(envExample, /RESEND_API_KEY=/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_RESEND/);
});
