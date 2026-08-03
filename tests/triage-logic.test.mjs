import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/triage.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const triage = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

test("GAD-7 uses the established 0-21 severity bands", () => {
  assert.equal(triage.evaluateGad7([0, 0, 0, 0, 0, 0, 0]).level, "low");
  assert.equal(triage.evaluateGad7([1, 1, 1, 1, 1, 0, 0]).level, "mild");
  assert.equal(triage.evaluateGad7([2, 2, 2, 2, 2, 0, 0]).level, "medium");
  assert.equal(triage.evaluateGad7([3, 3, 3, 3, 3, 0, 0]).level, "high");
});

test("TDAH summary checks symptoms, childhood, duration and cross-context impact", () => {
  const answers = Object.fromEntries(triage.ADHD_ITEMS.map((item, index) => [item.id, {
    adult: item.domain === "attention" && index < 5 ? 2 : 0,
    childhood: item.domain === "attention" && index < 3 ? "yes" : "no",
  }]));
  const result = triage.evaluateAdhd(answers, 2, "yes", true);
  assert.equal(result.adultAttention, 5);
  assert.equal(result.childhoodAttention, 3);
  assert.equal(result.crossContextImpairment, true);
  assert.equal(result.level, "high");
});

test("current symptoms alone do not produce a high TDAH summary", () => {
  const answers = Object.fromEntries(triage.ADHD_ITEMS.map((item) => [item.id, { adult: 3, childhood: "no" }]));
  const result = triage.evaluateAdhd(answers, 0, "no", false);
  assert.equal(result.adultThreshold, true);
  assert.equal(result.level, "low");
});

test("PHQ-9 uses the 0-27 severity bands without turning them into a diagnosis", () => {
  assert.equal(triage.evaluatePhq9([0, 0, 0, 0, 0, 0, 0, 0, 0]).level, "low");
  assert.equal(triage.evaluatePhq9([1, 1, 1, 1, 1, 0, 0, 0, 0]).level, "mild");
  assert.equal(triage.evaluatePhq9([2, 2, 2, 2, 2, 0, 0, 0, 0]).level, "medium");
  assert.equal(triage.evaluatePhq9([2, 2, 2, 2, 2, 2, 2, 1, 0]).level, "moderately-high");
  assert.equal(triage.evaluatePhq9([3, 3, 3, 3, 3, 3, 2, 0, 0]).level, "high");
});

test("PHQ-9 flags any nonzero answer to the safety item for human follow-up", () => {
  assert.equal(triage.evaluatePhq9([0, 0, 0, 0, 0, 0, 0, 0, 0]).safetyFollowUp, false);
  assert.equal(triage.evaluatePhq9([0, 0, 0, 0, 0, 0, 0, 0, 1]).safetyFollowUp, true);
});

test("bipolar screening pattern requires symptoms, concurrence and significant impact", () => {
  const sevenSymptoms = Object.fromEntries(
    triage.BIPOLAR_ITEMS.map((_, index) => [String(index), index < 7 ? "yes" : "no"]),
  );
  const completePattern = triage.evaluateBipolarScreen(sevenSymptoms, true, 2);
  assert.equal(completePattern.patternPresent, true);
  assert.equal(completePattern.level, "high");

  assert.equal(triage.evaluateBipolarScreen(sevenSymptoms, false, 2).patternPresent, false);
  assert.equal(triage.evaluateBipolarScreen(sevenSymptoms, true, 1).patternPresent, false);
});
