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
const pdfSource = await readFile(new URL("../lib/result-pdf.ts", import.meta.url), "utf8");
const pdfJavascript = transpile(pdfSource)
  .replace('from "./result-report"', `from "${reportUrl}"`)
  .replace('import("jspdf")', `import("${import.meta.resolve("jspdf")}")`);
const pdfModule = await import(`data:text/javascript;base64,${Buffer.from(pdfJavascript).toString("base64")}`);
const font = Buffer.from(await readFile(new URL("../public/fonts/Roboto-Variable.ttf", import.meta.url))).toString("base64");

const validReport = {
  test: "Ansiedade",
  generatedAt: "2026-08-05T12:00:00.000Z",
  headline: "Sintomas de ansiedade em faixa leve",
  summary: "Este resumo organiza os sinais informados.",
  score: "7 de 21 pontos",
  details: ["Impacto funcional informado: um pouco"],
};

test("generates a valid PDF attachment from a validated report", async () => {
  const document = await pdfModule.createResultPdf(validReport, font);
  const bytes = Buffer.from(document.output("arraybuffer"));

  assert.equal(bytes.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(bytes.length > 10_000);
  assert.equal(pdfModule.resultPdfFilename(validReport), "resumo-ansiedade-2026-08-05.pdf");
});
