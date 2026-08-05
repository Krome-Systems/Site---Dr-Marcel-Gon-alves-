import { RESULT_DISCLAIMER, formatResultDate, type ResultReport } from "./result-report";

type Rgb = [number, number, number];

const navy: Rgb = [10, 18, 48];
const night: Rgb = [10, 12, 16];
const blueBright: Rgb = [76, 144, 255];
const blueSoft: Rgb = [196, 214, 255];
const ink: Rgb = [20, 22, 26];
const muted: Rgb = [95, 101, 112];
const mist: Rgb = [239, 243, 249];
const line: Rgb = [217, 225, 236];

function testAccent(test: ResultReport["test"]): Rgb {
  if (test === "Ansiedade") return [255, 176, 32];
  if (test === "Sintomas depressivos") return [139, 107, 255];
  if (test === "Sinais de bipolaridade") return [255, 107, 138];
  return blueBright;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function loadPdfFont() {
  const response = await fetch("/fonts/Roboto-Variable.ttf", { cache: "force-cache" });
  if (!response.ok) throw new Error("Não foi possível carregar a fonte do PDF.");
  return arrayBufferToBase64(await response.arrayBuffer());
}

export async function createResultPdf(report: ResultReport, providedFont?: string) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const font = providedFont ?? await loadPdfFont();
  document.addFileToVFS("Roboto-Variable.ttf", font);
  document.addFont("Roboto-Variable.ttf", "Roboto", "normal");
  document.addFont("Roboto-Variable.ttf", "Roboto", "bold");

  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 40;
  const accent = testAccent(report.test);
  let y = 0;

  const drawHeader = (continuation = false) => {
    const headerHeight = continuation ? 28 : 58;
    document.setFillColor(...night);
    document.rect(0, 0, pageWidth, headerHeight, "F");
    document.setFillColor(...navy);
    document.circle(pageWidth - 19, continuation ? 7 : 17, continuation ? 18 : 34, "F");
    document.setFillColor(...accent);
    document.rect(0, 0, continuation ? 34 : 58, 2, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("Roboto", "bold");
    document.setFontSize(continuation ? 11 : 14);
    document.text("Instituto", 20, continuation ? 15 : 19);
    document.setFont("Roboto", "normal");
    document.setTextColor(...blueSoft);
    document.text("Dr. Marcel Gonçalves", continuation ? 39 : 20, continuation ? 15 : 27);
    if (!continuation) {
      document.setFont("Roboto", "bold");
      document.setFontSize(8.5);
      document.setTextColor(...accent);
      document.text("RESUMO PRIVADO DE TRIAGEM", 20, 42);
    }
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 22) return;
    document.addPage();
    drawHeader(true);
    y = 42;
  };

  const writeWrapped = (
    text: string,
    options?: { size?: number; color?: Rgb; leading?: number; bold?: boolean; width?: number; x?: number },
  ) => {
    const size = options?.size ?? 11;
    const leading = options?.leading ?? size * 0.48;
    const width = options?.width ?? contentWidth;
    const x = options?.x ?? 20;
    document.setFont("Roboto", options?.bold ? "bold" : "normal");
    document.setFontSize(size);
    document.setTextColor(...(options?.color ?? ink));
    const lines = document.splitTextToSize(text, width) as string[];
    ensureSpace(lines.length * leading + 4);
    document.text(lines, x, y);
    y += lines.length * leading + 4;
  };

  drawHeader();
  y = 73;

  document.setFillColor(...accent);
  document.roundedRect(20, y - 6, Math.min(72, report.test.length * 2.1 + 17), 9, 4.5, 4.5, "F");
  document.setFont("Roboto", "bold");
  document.setFontSize(7.5);
  document.setTextColor(...night);
  document.text(report.test.toUpperCase(), 25, y);
  y += 15;

  writeWrapped(report.headline, { size: 23, color: ink, leading: 10.6, bold: true });
  if (report.score) {
    ensureSpace(24);
    document.setFillColor(...mist);
    document.setDrawColor(...line);
    document.roundedRect(20, y, contentWidth, 20, 4, 4, "FD");
    document.setFillColor(...accent);
    document.circle(29, y + 10, 3, "F");
    document.setFont("Roboto", "bold");
    document.setFontSize(15);
    document.setTextColor(...ink);
    document.text(report.score, 38, y + 12);
    y += 28;
  }
  writeWrapped(report.summary, { size: 11, color: muted, leading: 6.1 });

  y += 3;
  for (const detail of report.details) {
    const lines = document.splitTextToSize(detail, contentWidth - 20) as string[];
    const blockHeight = Math.max(15, lines.length * 5 + 8);
    ensureSpace(blockHeight + 5);
    document.setFillColor(248, 250, 253);
    document.setDrawColor(...line);
    document.roundedRect(20, y, contentWidth, blockHeight, 3.5, 3.5, "FD");
    document.setFillColor(...accent);
    document.circle(28, y + blockHeight / 2, 1.5, "F");
    document.setFont("Roboto", "normal");
    document.setFontSize(9.8);
    document.setTextColor(...ink);
    document.text(lines, 35, y + 9);
    y += blockHeight + 5;
  }

  if (report.safetyNotice) {
    const safetyLines = document.splitTextToSize(report.safetyNotice, contentWidth - 14) as string[];
    const blockHeight = safetyLines.length * 5.1 + 20;
    ensureSpace(blockHeight + 7);
    document.setFillColor(255, 240, 240);
    document.setDrawColor(255, 90, 90);
    document.roundedRect(20, y, contentWidth, blockHeight, 4, 4, "FD");
    document.setFont("Roboto", "bold");
    document.setFontSize(10.5);
    document.setTextColor(112, 24, 35);
    document.text("SUA SEGURANÇA VEM PRIMEIRO", 27, y + 8);
    document.setFont("Roboto", "normal");
    document.setFontSize(9.2);
    document.text(safetyLines, 27, y + 15);
    y += blockHeight + 8;
  }

  const disclaimerLines = document.splitTextToSize(RESULT_DISCLAIMER, contentWidth - 14) as string[];
  const disclaimerHeight = disclaimerLines.length * 4.8 + 19;
  ensureSpace(disclaimerHeight + 7);
  document.setFillColor(...navy);
  document.roundedRect(20, y, contentWidth, disclaimerHeight, 4, 4, "F");
  document.setFont("Roboto", "bold");
  document.setFontSize(8.2);
  document.setTextColor(...blueBright);
  document.text("INFORMAÇÃO RESPONSÁVEL", 27, y + 8);
  document.setFont("Roboto", "normal");
  document.setFontSize(9);
  document.setTextColor(230, 237, 248);
  document.text(disclaimerLines, 27, y + 15);
  y += disclaimerHeight + 8;

  writeWrapped(`Gerado em ${formatResultDate(report.generatedAt)}. Guarde este arquivo para apresentar ao profissional durante a consulta.`, { size: 8.4, color: muted, leading: 4.5 });

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setDrawColor(...line);
    document.line(20, pageHeight - 13, pageWidth - 20, pageHeight - 13);
    document.setFont("Roboto", "normal");
    document.setFontSize(7.5);
    document.setTextColor(...muted);
    document.text("Triagem informativa · Sem diagnóstico automático", 20, pageHeight - 8);
    document.text(`${page} / ${pageCount}`, pageWidth - 20, pageHeight - 8, { align: "right" });
  }

  document.setProperties({
    title: `Resumo de triagem - ${report.test}`,
    subject: "Resumo informativo e não diagnóstico",
    author: "Instituto Dr. Marcel Gonçalves",
  });
  return document;
}

export async function downloadResultPdf(report: ResultReport) {
  const document = await createResultPdf(report);
  const date = report.generatedAt.slice(0, 10);
  const slug = report.test.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  document.save(`resumo-${slug}-${date}.pdf`);
}
