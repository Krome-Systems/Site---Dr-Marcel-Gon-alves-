import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const reportSource = await readFile(new URL("../lib/result-report.ts", import.meta.url), "utf8");
const reportUrl = `data:text/javascript;base64,${Buffer.from(transpile(reportSource)).toString("base64")}`;
const deliverySource = await readFile(new URL("../lib/result-delivery.ts", import.meta.url), "utf8");
const deliveryJavascript = transpile(deliverySource).replace('from "./result-report"', `from "${reportUrl}"`);
const delivery = await import(`data:text/javascript;base64,${Buffer.from(deliveryJavascript).toString("base64")}`);

const validReport = {
  test: "Ansiedade",
  generatedAt: "2026-08-03T12:00:00.000Z",
  headline: "Sintomas de ansiedade em faixa leve",
  summary: "Este resumo organiza os sinais informados.",
  score: "7 de 21 pontos",
  details: ["Impacto funcional informado: um pouco"],
};

test("accepts a minimal consented delivery and normalizes the email", () => {
  const payload = delivery.parseResultDeliveryPayload({
    email: "  Pessoa@Example.com ",
    consent: true,
    website: "",
    report: validReport,
  });
  assert.equal(payload.email, "pessoa@example.com");
  assert.deepEqual(payload.report.details, validReport.details);
});

test("rejects invalid email, missing consent and filled honeypot", () => {
  assert.equal(delivery.parseResultDeliveryPayload({ email: "invalido", consent: true, report: validReport }), null);
  assert.equal(delivery.parseResultDeliveryPayload({ email: "pessoa@example.com", consent: false, report: validReport }), null);
  assert.equal(delivery.parseResultDeliveryPayload({ email: "pessoa@example.com", consent: true, website: "spam", report: validReport }), null);
});

test("escapes report content before building the email HTML", () => {
  const html = delivery.buildResultEmailHtml({ ...validReport, summary: "<script>alert('x')</script>" });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
