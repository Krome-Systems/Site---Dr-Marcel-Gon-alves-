import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  buildResultEmailHtml,
  buildResultEmailText,
  parseResultDeliveryPayload,
} from "../../../lib/result-delivery";
import { createResultPdf, resultPdfFilename } from "../../../lib/result-pdf";

export const runtime = "nodejs";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function requestOriginIsAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return true;

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredSite) return false;
  try {
    return origin === new URL(configuredSite).origin;
  } catch {
    return false;
  }
}

function rateLimitAllows(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded?.slice(0, 64) || "unknown";
  const now = Date.now();
  if (requestBuckets.size > 5_000) {
    for (const [key, value] of requestBuckets) {
      if (value.resetAt <= now) requestBuckets.delete(key);
    }
    if (requestBuckets.size > 5_000) requestBuckets.clear();
  }
  const bucket = requestBuckets.get(clientKey);

  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!requestOriginIsAllowed(request)) return noStoreJson({ error: "Origem não permitida." }, 403);
  if (!rateLimitAllows(request)) return noStoreJson({ error: "Muitas tentativas. Aguarde alguns minutos." }, 429);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) return noStoreJson({ error: "Solicitação inválida." }, 413);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return noStoreJson({ error: "Solicitação inválida." }, 400);
  }

  const payload = parseResultDeliveryPayload(input);
  if (!payload) return noStoreJson({ error: "Revise o e-mail e o consentimento." }, 400);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESULT_FROM_EMAIL;
  if (!apiKey || !from) return noStoreJson({ error: "O envio por e-mail ainda não foi configurado." }, 503);

  let providerResponse: Response;
  try {
    const font = await readFile(join(process.cwd(), "public", "fonts", "Roboto-Variable.ttf"), "base64");
    const pdfDocument = await createResultPdf(payload.report, font);
    const pdfContent = Buffer.from(pdfDocument.output("arraybuffer")).toString("base64");

    providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
        "User-Agent": "instituto-dr-marcel/1.0",
      },
      body: JSON.stringify({
        from,
        to: [payload.email],
        subject: `Seu resumo de triagem - ${payload.report.test}`,
        html: buildResultEmailHtml(payload.report),
        text: buildResultEmailText(payload.report),
        attachments: [{
          content: pdfContent,
          filename: resultPdfFilename(payload.report),
        }],
        ...(process.env.RESULT_REPLY_TO ? { reply_to: process.env.RESULT_REPLY_TO } : {}),
      }),
      cache: "no-store",
    });
  } catch {
    return noStoreJson({ error: "Não foi possível enviar agora. Tente novamente mais tarde." }, 502);
  }

  if (!providerResponse.ok) return noStoreJson({ error: "Não foi possível enviar agora. Tente novamente mais tarde." }, 502);
  return noStoreJson({ ok: true }, 200);
}
