/**
 * Motore Preventivi / Quote.
 *
 * Come funziona: gestisce calcolo, formattazione strutturata e consegna via
 * email transazionale (Resend) di preventivi e stime professionali. Il calcolo
 * parte dai servizi/quantità richiesti; l'email parte solo a preventivo
 * confermato dall'utente.
 */

import { getResend } from "@/lib/resend";
import { logAudit } from "@/lib/audit";

export type QuoteItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
};

export type GenerateQuoteParams = {
  clientName: string;
  clientEmail: string;
  items: QuoteItem[];
  currency?: string;
  taxRate?: number;
  validDays?: number;
  notes?: string;
  tenantId?: string;
};

export type QuoteData = {
  quoteId: string;
  clientName: string;
  clientEmail: string;
  items: Array<QuoteItem & { total: number }>;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  validUntil: string;
  notes?: string;
  tenantId: string;
};

export function calculateQuote(params: GenerateQuoteParams): QuoteData {
  const currency = params.currency || "EUR";
  const taxRate = params.taxRate !== undefined ? params.taxRate : 0.22;
  const validDays = params.validDays || 30;

  const enrichedItems = (params.items || []).map((item) => {
    const qty = Math.max(Number(item.quantity) || 1, 1);
    const unit = Number(item.unitPrice) || 0;
    return {
      description: String(item.description || "Servizio"),
      quantity: qty,
      unitPrice: unit,
      total: Math.round(qty * unit * 100) / 100,
    };
  });

  const subtotal = enrichedItems.reduce((acc, it) => acc + it.total, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const now = new Date();
  const validDate = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

  const quoteId = `PREV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    quoteId,
    clientName: params.clientName || "Cliente",
    clientEmail: params.clientEmail,
    items: enrichedItems,
    currency,
    subtotal,
    taxRate,
    taxAmount,
    total,
    createdAt: now.toISOString().slice(0, 10),
    validUntil: validDate.toISOString().slice(0, 10),
    notes: params.notes,
    tenantId: params.tenantId || "default",
  };
}

export function formatQuoteMarkdown(quote: QuoteData): string {
  const symbol = quote.currency === "EUR" ? "€" : quote.currency;
  const lines: string[] = [
    `# Preventivo ${quote.quoteId}`,
    `**Cliente:** ${quote.clientName} (${quote.clientEmail})`,
    `**Data emissione:** ${quote.createdAt} | **Valido fino a:** ${quote.validUntil}`,
    "",
    "| Descrizione | Q.tà | Prezzo Unitario | Totale |",
    "| --- | --- | --- | --- |",
  ];

  for (const item of quote.items) {
    lines.push(
      `| ${item.description} | ${item.quantity} | ${symbol}${item.unitPrice.toFixed(2)} | ${symbol}${item.total.toFixed(2)} |`,
    );
  }

  lines.push("");
  lines.push(`- **Subtotale:** ${symbol}${quote.subtotal.toFixed(2)}`);
  lines.push(`- **IVA (${(quote.taxRate * 100).toFixed(0)}%):** ${symbol}${quote.taxAmount.toFixed(2)}`);
  lines.push(`- **Totale Complessivo:** **${symbol}${quote.total.toFixed(2)}**`);

  if (quote.notes) {
    lines.push("");
    lines.push(`*Note:* ${quote.notes}`);
  }

  return lines.join("\n");
}

export function buildQuoteHtmlEmail(quote: QuoteData): string {
  const symbol = quote.currency === "EUR" ? "€" : quote.currency;
  const rows = quote.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; text-align: left;">${item.description}</td>
      <td style="padding: 10px 8px; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 8px; text-align: right;">${symbol}${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${symbol}${item.total.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; color: #111827;">
      <div style="border-bottom: 2px solid #038bfe; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #038bfe; margin: 0; font-size: 24px;">Preventivo Ufficiale</h1>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Rif: <strong>${quote.quoteId}</strong></p>
      </div>

      <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
        <p style="margin: 0;">Gentile <strong>${quote.clientName}</strong>,</p>
        <p style="margin: 4px 0 0 0; color: #4b5563;">In allegato il riepilogo della proposta concordata, valida fino al <strong>${quote.validUntil}</strong>.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px; text-align: left; color: #4b5563;">Servizio / Voce</th>
            <th style="padding: 8px; text-align: center; color: #4b5563;">Q.tà</th>
            <th style="padding: 8px; text-align: right; color: #4b5563;">Prezzo</th>
            <th style="padding: 8px; text-align: right; color: #4b5563;">Totale</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="text-align: right; font-size: 14px; margin-bottom: 24px;">
        <p style="margin: 4px 0; color: #4b5563;">Subtotale: <strong>${symbol}${quote.subtotal.toFixed(2)}</strong></p>
        <p style="margin: 4px 0; color: #4b5563;">IVA (${(quote.taxRate * 100).toFixed(0)}%): <strong>${symbol}${quote.taxAmount.toFixed(2)}</strong></p>
        <p style="margin: 8px 0 0 0; font-size: 18px; color: #111827;">Totale: <strong style="color: #038bfe;">${symbol}${quote.total.toFixed(2)}</strong></p>
      </div>

      ${quote.notes ? `<div style="background: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 13px; color: #4b5563; margin-bottom: 20px;"><strong>Note:</strong> ${quote.notes}</div>` : ""}

      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
        Per confermare o richiedere modifiche a questo preventivo, rispondi direttamente a questo messaggio.
      </div>
    </div>
  `;
}

export async function sendQuoteByEmail(
  quote: QuoteData,
): Promise<{ ok: boolean; messageId?: string; previewOnly?: boolean }> {
  logAudit("quote_send_attempt", {
    quoteId: quote.quoteId,
    clientEmail: quote.clientEmail,
    total: quote.total,
    tenantId: quote.tenantId,
  });

  if (!process.env.RESEND_API_KEY) {
    logAudit("quote_send_skipped", { reason: "RESEND_API_KEY_missing" });
    return { ok: true, previewOnly: true };
  }

  try {
    const resend = getResend();
    const fromAddress = process.env.QUOTE_FROM_EMAIL || "preventivi@agentcloud.io";
    const res = await resend.emails.send({
      from: `AgentCloud Quotes <${fromAddress}>`,
      to: quote.clientEmail,
      subject: `Preventivo ${quote.quoteId} per ${quote.clientName}`,
      html: buildQuoteHtmlEmail(quote),
      text: formatQuoteMarkdown(quote),
    });

    logAudit("quote_sent", {
      quoteId: quote.quoteId,
      messageId: res.data?.id,
      clientEmail: quote.clientEmail,
    });

    return { ok: true, messageId: res.data?.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logAudit("quote_send_error", { quoteId: quote.quoteId, error: errMsg });
    return { ok: false };
  }
}
