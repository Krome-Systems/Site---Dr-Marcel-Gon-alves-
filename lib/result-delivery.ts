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
  const accent = report.test === "Ansiedade"
    ? "#ffb020"
    : report.test === "Sintomas depressivos"
      ? "#8b6bff"
      : report.test === "Sinais de bipolaridade"
        ? "#ff6b8a"
        : "#4c90ff";
  const detailItems = report.details.map((detail) => `<div style="margin:0 0 10px;padding:14px 16px;border:1px solid #d9e1ec;border-radius:14px;background:#f8fafd;color:#353b46;font-size:14px;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;margin-right:10px;border-radius:50%;background:${accent}"></span>${escapeHtml(detail)}</div>`).join("");
  const safetyBlock = report.safetyNotice
    ? `<div style="margin:24px 0;padding:18px;border:1px solid #ff6b6b;border-radius:16px;background:#fff0f0;color:#701823"><strong style="font-size:14px">Sua segurança vem primeiro</strong><p style="margin:8px 0 0;font-size:13px;line-height:1.6">${escapeHtml(report.safetyNotice)}</p></div>`
    : "";

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#eff3f9;color:#14161a;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 18px"><div style="overflow:hidden;border-radius:24px 24px 0 0;background:#0a0c10;color:#ffffff;padding:30px;border-top:3px solid ${accent}"><div style="font-size:20px;font-weight:700">Instituto <span style="color:#c4d6ff;font-weight:400">Dr. Marcel Gonçalves</span></div><div style="margin-top:16px;color:${accent};font-size:11px;font-weight:700;letter-spacing:.14em">RESUMO PRIVADO DE TRIAGEM</div></div><div style="background:#ffffff;padding:32px;border-radius:0 0 24px 24px"><div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${accent};color:#0a0c10;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(report.test)}</div><h1 style="margin:18px 0 0;font-size:32px;line-height:1.16;letter-spacing:-.03em">${escapeHtml(report.headline)}</h1>${report.score ? `<div style="margin:22px 0;padding:16px 18px;border:1px solid #d9e1ec;border-radius:15px;background:#eff3f9;font-size:20px"><span style="display:inline-block;width:9px;height:9px;margin-right:10px;border-radius:50%;background:${accent}"></span><strong>${escapeHtml(report.score)}</strong></div>` : ""}<p style="margin:20px 0;color:#5f6570;font-size:15px;line-height:1.7">${escapeHtml(report.summary)}</p><div style="margin-top:22px">${detailItems}</div>${safetyBlock}<div style="margin-top:26px;padding:20px;border-radius:16px;background:#0a1230;color:#e6edf8;font-size:13px;line-height:1.6"><strong style="display:block;margin-bottom:7px;color:#4c90ff;font-size:11px;letter-spacing:.12em">INFORMAÇÃO RESPONSÁVEL</strong>${escapeHtml(RESULT_DISCLAIMER)}</div><p style="margin:24px 0 0;color:#737c8a;font-size:11px;line-height:1.55">Gerado em ${escapeHtml(formatResultDate(report.generatedAt))}. O Instituto não armazena as respostas por meio deste envio.</p></div></div></body></html>`;
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
