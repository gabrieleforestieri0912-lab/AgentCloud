"use client";

/**
 * DashboardExportBar — Barra di esportazione per la dashboard.
 *
 * Mostra pulsanti PDF e Looker Studio per esportare i dati della dashboard.
 */

import ExportReportButton from "./ExportReportButton";

type DashboardExportBarProps = {
  agentName: string;
  agentSlug: string;
  totalRuns: number;
  totalTokens: number;
  estimatedCostCents: number;
  daily: Array<{ date: string; runs: number; tokens: number }>;
};

export default function DashboardExportBar({
  agentName,
  agentSlug,
  totalRuns,
  totalTokens,
  estimatedCostCents,
  daily,
}: DashboardExportBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-neutral-900 p-4">
      <div>
        <p className="text-sm font-bold text-white">Esporta Report</p>
        <p className="text-xs text-neutral-500">Scarica i dati in PDF o per Looker Studio</p>
      </div>
      <ExportReportButton
        type="dashboard"
        stats={{
          agentName,
          totalRuns,
          totalTokens,
          estimatedCostCents,
          daily,
        }}
        agentName={agentName}
        agentSlug={agentSlug}
      />
    </div>
  );
}
