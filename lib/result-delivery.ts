import {
  RESULT_DISCLAIMER,
  RESULT_TEST_NAMES,
  formatResultDate,
  type ResultReport,
} from "./result-report";

export type ResultDeliveryPayload = {
  email: string;
  consent: true;
  website?: string;
  report: ResultReport;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned && cleaned.length <= maxLength ? cleaned : null;
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && emailPattern.test(email) ? email : null;
}

export function parseResultDeliveryPayload(value: unknown): ResultDeliveryPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const email = normalizeEmail(input.email);
  if (!email || input.consent !== true) return null;
  if (typeof input.website === "string" && input.website.trim()) return null;

  if (!input.report || typeof input.report !== "object") return null;
  const reportInput = input.report as Record<string, unknown>;
  const test = cleanText(reportInput.test, 60);
  const generatedAt = cleanText(reportInput.generatedAt, 40);
  const headline = cleanText(reportInput.headline, 160);
  const summary = cleanText(reportInput.summary, 800);
  const score = reportInput.score === undefined ? undefined : cleanText(reportInput.score, 80);
  const safetyNotice = reportInput.safetyNotice === undefined
    ? undefined
    : cleanText(reportInput.safetyNotice, 500);

  if (!test || !RESULT_TEST_NAMES.includes(test as ResultReport["test"]) || !generatedAt || !headline || !summary) return null;
  if (Number.isNaN(new Date(generatedAt).getTime())) return null;
  if (score === null || safetyNotice === null || !Array.isArray(reportInput.details) || reportInput.details.length > 10) return null;

  const details = reportInput.details.map((item) => cleanText(item, 220));
  if (details.some((item) => item === null)) return null;

  return {
    email,
    consent: true,
    report: {
      test: test as ResultReport["test"],
      generatedAt,
      headline,
      summary,
      score,
      details: details as string[],
      safetyNotice,
    },
  };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export function buildResultEmailHtml(report: ResultReport) {
  const detailItems = report.details.map((detail) => `<li style="margin:0 0 10px">${escapeHtml(detail)}</li>`).join("");
  const safetyBlock = report.safetyNotice
    ? `<div style="margin:24px 0;padding:16px;border:1px solid #6f2837;background:#f5e5df"><strong>Orientação de segurança</strong><p style="margin:8px 0 0;line-height:1.6">${escapeHtml(report.safetyNotice)}</p></div>`
    : "";

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf5ec;color:#2c2022;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#6f2837;color:#fffdf8;padding:28px"><div style="font-family:Georgia,serif;font-size:24px">Instituto Dr. Marcel Gonçalves</div><div style="margin-top:8px;opacity:.8">Resumo privado de triagem</div></div><div style="background:#fffdf8;padding:30px"><div style="color:#a4584c;font-size:12px;text-transform:uppercase;letter-spacing:.12em">${escapeHtml(report.test)}</div><h1 style="font:32px/1.2 Georgia,serif;margin:16px 0">${escapeHtml(report.headline)}</h1>${report.score ? `<p style="font-size:20px;color:#6f2837"><strong>${escapeHtml(report.score)}</strong></p>` : ""}<p style="line-height:1.7;color:#5f5052">${escapeHtml(report.summary)}</p><ul style="padding-left:20px;line-height:1.5">${detailItems}</ul>${safetyBlock}<div style="margin-top:26px;padding:18px;background:#efe2d8;font-size:13px;line-height:1.6"><strong>Importante:</strong> ${escapeHtml(RESULT_DISCLAIMER)}</div><p style="margin-top:24px;color:#78696a;font-size:12px">Gerado em ${escapeHtml(formatResultDate(report.generatedAt))}. O Instituto não armazena as respostas por meio deste envio.</p></div></div></body></html>`;
}

export function buildResultEmailText(report: ResultReport) {
  const lines = [
    "INSTITUTO DR. MARCEL GONÇALVES",
    `Triagem: ${report.test}`,
    `Gerado em: ${formatResultDate(report.generatedAt)}`,
    "",
    report.headline,
    report.score ?? "",
    report.summary,
    "",
    ...report.details.map((detail) => `- ${detail}`),
    report.safetyNotice ? `\nORIENTAÇÃO DE SEGURANÇA\n${report.safetyNotice}` : "",
    `\nIMPORTANTE\n${RESULT_DISCLAIMER}`,
  ];
  return lines.filter(Boolean).join("\n");
}
