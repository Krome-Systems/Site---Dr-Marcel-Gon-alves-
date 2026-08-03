import { RESULT_DISCLAIMER, formatResultDate, type ResultReport } from "./result-report";

const wine: [number, number, number] = [111, 40, 55];
const ink: [number, number, number] = [44, 32, 34];
const muted: [number, number, number] = [120, 105, 106];

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
  const contentWidth = pageWidth - 40;
  let y = 0;

  const ensureSpace = (height: number) => {
    if (y + height <= 275) return;
    document.addPage();
    y = 24;
  };

  const writeWrapped = (text: string, options?: { size?: number; color?: [number, number, number]; leading?: number; bold?: boolean }) => {
    const size = options?.size ?? 11;
    const leading = options?.leading ?? size * 0.48;
    document.setFont("Roboto", options?.bold ? "bold" : "normal");
    document.setFontSize(size);
    document.setTextColor(...(options?.color ?? ink));
    const lines = document.splitTextToSize(text, contentWidth) as string[];
    ensureSpace(lines.length * leading + 4);
    document.text(lines, 20, y);
    y += lines.length * leading + 4;
  };

  document.setFillColor(...wine);
  document.rect(0, 0, pageWidth, 48, "F");
  document.setTextColor(255, 253, 248);
  document.setFont("Roboto", "bold");
  document.setFontSize(20);
  document.text("Instituto Dr. Marcel Gonçalves", 20, 23);
  document.setFont("Roboto", "normal");
  document.setFontSize(10);
  document.text("Resumo privado de triagem", 20, 32);
  y = 64;

  writeWrapped(report.test.toUpperCase(), { size: 9, color: wine, bold: true });
  writeWrapped(report.headline, { size: 22, color: ink, leading: 10, bold: true });
  if (report.score) writeWrapped(report.score, { size: 15, color: wine, bold: true });
  writeWrapped(report.summary, { size: 11, color: muted, leading: 6 });

  y += 3;
  for (const detail of report.details) {
    ensureSpace(12);
    document.setFillColor(164, 88, 76);
    document.circle(22, y - 1.2, 1.1, "F");
    const lines = document.splitTextToSize(detail, contentWidth - 8) as string[];
    document.setFont("Roboto", "normal");
    document.setFontSize(10.5);
    document.setTextColor(...ink);
    document.text(lines, 27, y);
    y += lines.length * 5.2 + 4;
  }

  if (report.safetyNotice) {
    const safetyLines = document.splitTextToSize(report.safetyNotice, contentWidth - 12) as string[];
    const blockHeight = safetyLines.length * 5.2 + 18;
    ensureSpace(blockHeight);
    document.setFillColor(245, 229, 223);
    document.setDrawColor(...wine);
    document.roundedRect(20, y, contentWidth, blockHeight, 2, 2, "FD");
    document.setFont("Roboto", "bold");
    document.setFontSize(11);
    document.setTextColor(...wine);
    document.text("Orientação de segurança", 26, y + 8);
    document.setFont("Roboto", "normal");
    document.setFontSize(9.5);
    document.setTextColor(...ink);
    document.text(safetyLines, 26, y + 15);
    y += blockHeight + 8;
  }

  ensureSpace(35);
  document.setFillColor(239, 226, 216);
  const disclaimerLines = document.splitTextToSize(RESULT_DISCLAIMER, contentWidth - 12) as string[];
  const disclaimerHeight = disclaimerLines.length * 5 + 16;
  document.roundedRect(20, y, contentWidth, disclaimerHeight, 2, 2, "F");
  document.setFont("Roboto", "bold");
  document.setFontSize(9.5);
  document.setTextColor(...ink);
  document.text("IMPORTANTE", 26, y + 7);
  document.setFont("Roboto", "normal");
  document.text(disclaimerLines, 26, y + 14);
  y += disclaimerHeight + 8;

  writeWrapped(`Gerado em ${formatResultDate(report.generatedAt)}. Guarde este arquivo para apresentar ao profissional durante a consulta.`, { size: 8.5, color: muted, leading: 4.5 });
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
