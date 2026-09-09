/**
 * PDF Export utility per report della chat e dashboard.
 *
 * Genera PDF professionali con:
 * - Logo e header branded
 * - Tabella messaggi chat formattata
 * - Statistiche dashboard (esecuzioni, token, costi)
 * - Footer con data e watermark AgentCloud
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Estende il tipo jsPDF per autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  agentName?: string;
  timestamp?: string;
};

type DashboardStats = {
  agentName: string;
  totalRuns: number;
  totalTokens: number;
  estimatedCostCents: number;
  daily: Array<{ date: string; runs: number; tokens: number }>;
};

type ReportOptions = {
  title: string;
  subtitle?: string;
  locale?: string;
  includeStats?: boolean;
};

/**
 * Formatta una data in base alla locale.
 */
function formatDate(date: Date, locale: string = "it-IT"): string {
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tronca un testo alla lunghezza massima.
 */
function truncate(text: string, maxLen: number = 80): string {
  return text.length > maxLen ? text.substring(0, maxLen) + "…" : text;
}

/**
 * Genera un PDF report dalla chat.
 */
export function generateChatReport(
  messages: ChatMessage[],
  options: ReportOptions,
): Blob {
  const doc = new jsPDF();
  const { title, subtitle, locale = "it-IT" } = options;
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFillColor(15, 15, 15); // neutral-950
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 22);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 20, 32);
  }

  // Data generazione
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generato: ${formatDate(new Date(), locale)}`, pageWidth - 20, 32, {
    align: "right",
  });

  // --- Statistiche ---
  let startY = 50;
  const userMessages = messages.filter((m) => m.role === "user").length;
  const assistantMessages = messages.filter((m) => m.role === "assistant").length;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Riepilogo", 20, startY);
  startY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Messaggi totali: ${messages.length}`, 20, startY);
  doc.text(`Utente: ${userMessages}  |  Assistente: ${assistantMessages}`, 20, startY + 6);
  startY += 16;

  // --- Tabella messaggi ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Conversazione", 20, startY);
  startY += 4;

  const tableData = messages.map((m) => [
    m.role === "user" ? "Utente" : (m.agentName || "Assistente"),
    truncate(m.content, 120),
    m.timestamp ? formatDate(new Date(m.timestamp), locale) : "—",
  ]);

  doc.autoTable({
    startY,
    head: [["Ruolo", "Messaggio", "Ora"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [3, 139, 254], // brand-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 35 },
    },
    margin: { left: 20, right: 20 },
    didDrawPage: () => {
      // Footer su ogni pagina
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `AgentCloud — Pagina ${i} di ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      }
    },
  });

  return doc.output("blob");
}

/**
 * Genera un PDF report dalla dashboard con statistiche e grafico tabulare.
 */
export function generateDashboardReport(
  stats: DashboardStats,
  options: ReportOptions,
): Blob {
  const doc = new jsPDF();
  const { title, locale = "it-IT" } = options;
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Agente: ${stats.agentName}`, 20, 32);

  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generato: ${formatDate(new Date(), locale)}`, pageWidth - 20, 32, {
    align: "right",
  });

  // --- KPI Cards ---
  let y = 50;
  const costEuro = (stats.estimatedCostCents / 100).toFixed(2);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("KPI Mensili", 20, y);
  y += 10;

  // KPI boxes
  const kpis = [
    { label: "Esecuzioni", value: stats.totalRuns.toLocaleString(locale) },
    { label: "Token", value: stats.totalTokens.toLocaleString(locale) },
    { label: "Costo stimato", value: `€${costEuro}` },
  ];

  const boxWidth = (pageWidth - 60) / 3;
  kpis.forEach((kpi, i) => {
    const x = 20 + i * (boxWidth + 10);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, boxWidth, 25, 3, 3, "F");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(kpi.label, x + boxWidth / 2, y + 10, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(kpi.value, x + boxWidth / 2, y + 20, { align: "center" });
    doc.setFont("helvetica", "normal");
  });

  y += 35;

  // --- Tabella giornaliera ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Dettaglio Giornaliero", 20, y);
  y += 4;

  const dailyData = stats.daily.map((d) => [
    d.date,
    d.runs.toLocaleString(locale),
    d.tokens.toLocaleString(locale),
    ((d.tokens * 0.000003).toFixed(4)), // costo stimato per token
  ]);

  doc.autoTable({
    startY: y,
    head: [["Data", "Esecuzioni", "Token", "Costo (€)"]],
    body: dailyData,
    theme: "striped",
    headStyles: {
      fillColor: [3, 139, 254],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    margin: { left: 20, right: 20 },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `AgentCloud — Pagina ${i} di ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      }
    },
  });

  return doc.output("blob");
}

/**
 * Download di un blob come file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
