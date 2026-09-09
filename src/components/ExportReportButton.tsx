"use client";

/**
 * ExportReportButton — Pulsante per esportare report in PDF o Looker Studio.
 *
 * Usage:
 *   <ExportReportButton type="chat" messages={messages} agentName="SEO Agent" />
 *   <ExportReportButton type="dashboard" stats={dashboardStats} agentSlug="seo-agent" />
 */

import { useState } from "react";
import { Download, FileText, Table, Loader2, Check } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type ExportType = "chat" | "dashboard";

type ExportReportButtonProps = {
  type: ExportType;
  /** Per type="chat" */
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
    agentName?: string;
    timestamp?: string;
  }>;
  /** Per type="dashboard" */
  stats?: {
    agentName: string;
    totalRuns: number;
    totalTokens: number;
    estimatedCostCents: number;
    daily: Array<{ date: string; runs: number; tokens: number }>;
  };
  agentName?: string;
  agentSlug?: string;
  className?: string;
};

export default function ExportReportButton({
  type,
  messages = [],
  stats,
  agentName = "AgentCloud",
  agentSlug = "agent",
  className = "",
}: ExportReportButtonProps) {
  const { dict } = useLanguage();
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [done, setDone] = useState<"pdf" | "csv" | null>(null);

  const handlePdfExport = async () => {
    setExporting("pdf");
    setDone(null);
    try {
      const { generateChatReport, generateDashboardReport, downloadBlob } = await import(
        "@/lib/tools/pdf-export"
      );

      let blob: Blob;
      let filename: string;

      if (type === "chat") {
        blob = generateChatReport(messages, {
          title: `Report Chat — ${agentName}`,
          subtitle: `Generato da AgentCloud`,
        });
        filename = `agentcloud-chat-${agentSlug}-${Date.now()}.pdf`;
      } else if (stats) {
        blob = generateDashboardReport(stats, {
          title: `Report Dashboard — ${stats.agentName}`,
        });
        filename = `agentcloud-dashboard-${agentSlug}-${Date.now()}.pdf`;
      } else {
        return;
      }

      downloadBlob(blob, filename);
      setDone("pdf");
      setTimeout(() => setDone(null), 3000);
    } finally {
      setExporting(null);
    }
  };

  const handleCsvExport = async () => {
    setExporting("csv");
    setDone(null);
    try {
      const res = await fetch(
        `/api/looker-studio?agent=${agentSlug}&format=csv`,
      );
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentcloud-${agentSlug}-looker-studio.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDone("csv");
      setTimeout(() => setDone(null), 3000);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* PDF Export */}
      <button
        onClick={handlePdfExport}
        disabled={exporting === "pdf"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        title="Esporta PDF"
      >
        {exporting === "pdf" ? (
          <Loader2 size={12} className="animate-spin" />
        ) : done === "pdf" ? (
          <Check size={12} className="text-emerald-400" />
        ) : (
          <FileText size={12} />
        )}
        PDF
      </button>

      {/* CSV / Looker Studio Export */}
      <button
        onClick={handleCsvExport}
        disabled={exporting === "csv"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        title="Esporta per Looker Studio"
      >
        {exporting === "csv" ? (
          <Loader2 size={12} className="animate-spin" />
        ) : done === "csv" ? (
          <Check size={12} className="text-emerald-400" />
        ) : (
          <Table size={12} />
        )}
        Looker Studio
      </button>
    </div>
  );
}
