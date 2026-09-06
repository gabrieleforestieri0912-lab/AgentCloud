/**
 * Finance Manager tools: cash-flow summary, invoice generation, payment reminders.
 *
 * Cash flow prefers user-uploaded CSV/text. If none is provided and
 * STRIPE_SECRET_KEY is set (typical self-hosted / merchant key), it falls
 * back to Stripe balance transactions.
 */

import Stripe from "stripe";
import { getResend } from "@/lib/resend";
import { logAudit } from "@/lib/audit";

export type CashFlowEntry = {
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  source: "file" | "stripe";
};

export type CashFlowSummary = {
  income: number;
  expense: number;
  net: number;
  currency: string;
  entries: CashFlowEntry[];
  source: "file" | "stripe" | "empty";
  note?: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceData = {
  invoiceId: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issuedAt: string;
  dueDate: string;
  notes?: string;
};

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[€$£]/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function classifyType(value: string, amount: number): "income" | "expense" {
  const v = value.toLowerCase();
  if (/(expens|uscita|costo|debit|payout|chargeback|fee)/.test(v)) return "expense";
  if (/(income|incasso|credit|charge|payment|entrata|ricavo)/.test(v)) return "income";
  return amount < 0 ? "expense" : "income";
}

/**
 * Parse a simple CSV or TSV: date,type,amount,description (header optional).
 */
export function parseCashFlowCsv(text: string, source: "file" = "file"): CashFlowEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0].toLowerCase();
  const hasHeader = /date|data|amount|importo|type|tipo/.test(first);
  const rows = hasHeader ? lines.slice(1) : lines;

  const entries: CashFlowEntry[] = [];
  for (const row of rows) {
    const cols = row.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2) continue;

    let date = "";
    let typeRaw = "";
    let amountRaw = "";
    let description = "";

    if (cols.length >= 4) {
      [date, typeRaw, amountRaw, description] = cols;
    } else if (cols.length === 3) {
      [date, amountRaw, description] = cols;
    } else {
      date = cols[0];
      amountRaw = cols[1];
    }

    const amount = parseAmount(amountRaw);
    if (!amount) continue;
    entries.push({
      date: date || new Date().toISOString().slice(0, 10),
      type: classifyType(typeRaw || description, amount),
      amount: Math.abs(amount),
      description: description || typeRaw || "Movimento",
      source,
    });
  }
  return entries;
}

function summarize(entries: CashFlowEntry[], currency: string, source: CashFlowSummary["source"], note?: string): CashFlowSummary {
  const income = money(entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0));
  const expense = money(entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0));
  return {
    income,
    expense,
    net: money(income - expense),
    currency,
    entries: entries.slice(0, 50),
    source,
    note,
  };
}

async function fetchStripeCashFlow(days: number): Promise<CashFlowEntry[] | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const stripe = new Stripe(key, {});
  const created = { gte: Math.floor(Date.now() / 1000) - days * 86400 };
  const txns = await stripe.balanceTransactions.list({
    limit: 100,
    created,
  });

  return txns.data.map((t) => {
    const amount = Math.abs(t.amount) / 100;
    const isExpense = t.amount < 0 || t.type === "payout" || t.type === "stripe_fee" || t.reporting_category === "fee";
    return {
      date: new Date(t.created * 1000).toISOString().slice(0, 10),
      type: (isExpense ? "expense" : "income") as "income" | "expense",
      amount,
      description: t.description || t.reporting_category || t.type,
      source: "stripe" as const,
    };
  });
}

export async function getFinanceCashFlow(params: {
  csvText?: string;
  days?: number;
}): Promise<CashFlowSummary> {
  const days = Math.min(90, Math.max(1, params.days || 30));

  if (params.csvText?.trim()) {
    const entries = parseCashFlowCsv(params.csvText);
    return summarize(
      entries,
      "EUR",
      entries.length ? "file" : "empty",
      entries.length ? undefined : "Nessun movimento valido nel file. Atteso CSV: date,type,amount,description",
    );
  }

  try {
    const stripeEntries = await fetchStripeCashFlow(days);
    if (stripeEntries && stripeEntries.length > 0) {
      return summarize(stripeEntries, "EUR", "stripe");
    }
    if (stripeEntries && stripeEntries.length === 0) {
      return summarize([], "EUR", "stripe", `Nessuna transazione Stripe negli ultimi ${days} giorni.`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logAudit("finance_cashflow_stripe_error", { error: msg });
    return summarize([], "EUR", "empty", `Stripe non disponibile (${msg}). Carica un CSV: date,type,amount,description.`);
  }

  return summarize(
    [],
    "EUR",
    "empty",
    "Nessun file caricato e STRIPE_SECRET_KEY non configurata. Carica un CSV (date,type,amount,description) oppure configura Stripe.",
  );
}

export function formatCashFlowMarkdown(summary: CashFlowSummary): string {
  const symbol = summary.currency === "EUR" ? "€" : summary.currency;
  const lines = [
    `# Cash flow`,
    `**Fonte:** ${summary.source}`,
    `**Entrate:** ${symbol}${summary.income.toFixed(2)}`,
    `**Uscite:** ${symbol}${summary.expense.toFixed(2)}`,
    `**Netto:** **${symbol}${summary.net.toFixed(2)}**`,
  ];
  if (summary.note) {
    lines.push("", `> ${summary.note}`);
  }
  if (summary.entries.length) {
    lines.push("", "| Data | Tipo | Importo | Descrizione |", "| --- | --- | --- | --- |");
    for (const e of summary.entries) {
      lines.push(
        `| ${e.date} | ${e.type} | ${symbol}${e.amount.toFixed(2)} | ${e.description} |`,
      );
    }
  }
  return lines.join("\n");
}

export function createInvoice(params: {
  clientName: string;
  clientEmail: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  currency?: string;
  taxRate?: number;
  dueDays?: number;
  notes?: string;
}): InvoiceData {
  const currency = params.currency || "EUR";
  const taxRate = params.taxRate !== undefined ? params.taxRate : 0.22;
  const dueDays = params.dueDays || 30;
  const items = (params.items || []).map((item) => {
    const qty = Math.max(Number(item.quantity) || 1, 1);
    const unit = Number(item.unitPrice) || 0;
    return {
      description: String(item.description || "Voce"),
      quantity: qty,
      unitPrice: unit,
      total: money(qty * unit),
    };
  });
  const subtotal = money(items.reduce((s, i) => s + i.total, 0));
  const taxAmount = money(subtotal * taxRate);
  const total = money(subtotal + taxAmount);
  const now = new Date();
  const due = new Date(now.getTime() + dueDays * 86400000);
  const invoiceId = `FATT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    invoiceId,
    clientName: params.clientName || "Cliente",
    clientEmail: params.clientEmail,
    items,
    currency,
    subtotal,
    taxRate,
    taxAmount,
    total,
    issuedAt: now.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    notes: params.notes,
  };
}

export function formatInvoiceMarkdown(invoice: InvoiceData): string {
  const symbol = invoice.currency === "EUR" ? "€" : invoice.currency;
  const lines = [
    `# Fattura ${invoice.invoiceId}`,
    `**Cliente:** ${invoice.clientName} (${invoice.clientEmail})`,
    `**Emessa:** ${invoice.issuedAt} | **Scadenza:** ${invoice.dueDate}`,
    "",
    "| Descrizione | Q.tà | Prezzo | Totale |",
    "| --- | --- | --- | --- |",
  ];
  for (const item of invoice.items) {
    lines.push(
      `| ${item.description} | ${item.quantity} | ${symbol}${item.unitPrice.toFixed(2)} | ${symbol}${item.total.toFixed(2)} |`,
    );
  }
  lines.push(
    "",
    `- **Subtotale:** ${symbol}${invoice.subtotal.toFixed(2)}`,
    `- **IVA (${(invoice.taxRate * 100).toFixed(0)}%):** ${symbol}${invoice.taxAmount.toFixed(2)}`,
    `- **Totale:** **${symbol}${invoice.total.toFixed(2)}**`,
  );
  if (invoice.notes) {
    lines.push("", `*Note:* ${invoice.notes}`);
  }
  return lines.join("\n");
}

export function formatInvoiceHtml(invoice: InvoiceData): string {
  const symbol = invoice.currency === "EUR" ? "€" : invoice.currency;
  const rows = invoice.items
    .map(
      (item) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.description}</td>
      <td style="padding:8px;text-align:center;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e5e7eb;">${symbol}${item.unitPrice.toFixed(2)}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e5e7eb;">${symbol}${item.total.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invoice.invoiceId}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:640px;margin:24px auto;color:#111827;">
  <h1 style="color:#038bfe;margin:0 0 8px;">Fattura ${invoice.invoiceId}</h1>
  <p>Cliente: <strong>${invoice.clientName}</strong> (${invoice.clientEmail})</p>
  <p>Emessa: ${invoice.issuedAt} · Scadenza: ${invoice.dueDate}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead><tr style="background:#f9fafb;">
      <th style="text-align:left;padding:8px;">Descrizione</th>
      <th>Q.tà</th><th style="text-align:right;">Prezzo</th><th style="text-align:right;">Totale</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="text-align:right;">Subtotale ${symbol}${invoice.subtotal.toFixed(2)}<br>
  IVA ${(invoice.taxRate * 100).toFixed(0)}% ${symbol}${invoice.taxAmount.toFixed(2)}<br>
  <strong>Totale ${symbol}${invoice.total.toFixed(2)}</strong></p>
  ${invoice.notes ? `<p>${invoice.notes}</p>` : ""}
</body></html>`;
}

export function invoiceDownloadPayload(invoice: InvoiceData): string {
  return JSON.stringify({
    type: "file_created",
    filename: `${invoice.invoiceId}.html`,
    content: formatInvoiceHtml(invoice),
    downloadable: true,
    invoiceId: invoice.invoiceId,
    markdown: formatInvoiceMarkdown(invoice),
  });
}

export async function sendPaymentReminder(params: {
  clientName: string;
  clientEmail: string;
  invoiceId?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
}): Promise<string> {
  const name = params.clientName || "Cliente";
  const email = params.clientEmail;
  const symbol = params.currency === "EUR" || !params.currency ? "€" : params.currency;
  const amountLabel =
    params.amount !== undefined ? `${symbol}${params.amount.toFixed(2)}` : "l'importo dovuto";
  const invoiceLabel = params.invoiceId || "la fattura in sospeso";
  const due = params.dueDate ? ` (scadenza ${params.dueDate})` : "";

  const text = `Gentile ${name},\n\nTi ricordiamo il pagamento di ${invoiceLabel}${due} per ${amountLabel}.\n\nGrazie,\nAgentCloud Finance`;
  const html = `<p>Gentile <strong>${name}</strong>,</p>
    <p>Ti ricordiamo il pagamento di <strong>${invoiceLabel}</strong>${due} per <strong>${amountLabel}</strong>.</p>
    <p>Grazie,<br/>AgentCloud Finance</p>`;

  logAudit("finance_reminder_attempt", { email, invoiceId: params.invoiceId });

  if (!process.env.RESEND_API_KEY) {
    return `payment_reminder_sent (preview): ${email}\n\n${text}`;
  }

  try {
    const resend = getResend();
    const fromAddress = process.env.QUOTE_FROM_EMAIL || "finance@agentcloud.io";
    const res = await resend.emails.send({
      from: `AgentCloud Finance <${fromAddress}>`,
      to: email,
      subject: `Sollecito pagamento ${params.invoiceId || ""}`.trim(),
      html,
      text,
    });
    return `payment_reminder_sent to ${email} (ID: ${res.data?.id || "ok"})`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logAudit("finance_reminder_error", { email, error: msg });
    return `Errore invio sollecito: ${msg}`;
  }
}
