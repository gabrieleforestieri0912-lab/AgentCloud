/**
 * Formato comune per prodotti e ordini, condiviso da Shopify e WooCommerce.
 *
 * Perché esiste: gli agenti devono poter ragionare su "un prodotto" e "un
 * ordine" senza sapere quale piattaforma li ha prodotti. Prima ogni connettore
 * restituiva testo grezzo diverso e il prompt di sistema doveva spiegare due
 * formati — con il risultato che l'agente sbagliava a ogni cambio di store.
 *
 * Nota sull'audit: NON esisteva normalizzazione riutilizzabile. Shopify costruiva
 * il markdown inline nei `case` di tools.ts. Quindi qui non è riuso ma codice
 * nuovo. Per non rompere Shopify in questo batch, `formatProduct`/`formatOrder`
 * sono usati solo da WooCommerce: adottarli anche per Shopify è un passo
 * separato, da fare quando nessun prompt dependerà più dal formato vecchio.
 */

export type NormalizedMoney = {
  amount: string;
  currency: string;
};

export type NormalizedProduct = {
  id: string;
  title: string;
  url: string | null;
  price: NormalizedMoney | null;
  compareAtPrice: NormalizedMoney | null;
  available: boolean | null;
  sku: string | null;
  /** Data ISO o null. */
  updatedAt: string | null;
};

export type NormalizedOrderLine = {
  title: string;
  quantity: number;
  total: NormalizedMoney | null;
};

export type NormalizedOrder = {
  id: string;
  /** Numero leggibile, quello che l'utente riconosce ("#1042"). */
  number: string;
  status: string;
  /** Totale ordine. */
  total: NormalizedMoney | null;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  lines: NormalizedOrderLine[];
  createdAt: string | null;
  url: string | null;
};

/** Arrotonda a 2 decimali e forza il punto: `12,5` → "12.50". */
function money(amount: number, currency: string): NormalizedMoney {
  return { amount: (Math.round(amount * 100) / 100).toFixed(2), currency };
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Estrae un importo numerico da numeri e stringhe.
 *
 * Gestisce i due formati che si incontrano davvero: "12.90" (API WooCommerce) e
 * "12,90" / "1.234,56" (formato italiano con punto come separatore delle
 * migliaia). La regola: se ci sono sia punto che virgola, l'ULTIMO dei due è il
 * separatore decimale e l'altro è delle migliaia.
 *
 * Restituisce null (non 0) quando non c'è un numero. È importante: WooCommerce
 * manda stringa vuota per i prodotti a prezzo variabile, e `Number("")` è 0,
 * quindi senza questo controllo un prodotto senza prezzo fisso risulterebbe
 * "gratis" all'agente.
 */
export function parseAmount(v: unknown): number | null {
  if (isNum(v)) return v;
  if (typeof v !== "string") return null;

  const cleaned = v.replace(/[^\d.,-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  let normalized: string;
  if (lastDot !== -1 && lastComma !== -1) {
    // Entrambi presenti: l'ultimo è il decimale, l'altro è il migliaia.
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    normalized = cleaned.split(thousandsSep).join("");
    const idx = normalized.lastIndexOf(decimalSep);
    normalized =
      normalized.slice(0, idx).replace(new RegExp(`\\${decimalSep}`, "g"), "") +
      "." +
      normalized.slice(idx + 1);
  } else if (lastComma !== -1) {
    // Solo virgole: decimale se segue da 1-2 cifre, altrimenti migliaia.
    const decimals = cleaned.length - lastComma - 1;
    normalized =
      decimals > 0 && decimals <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// WooCommerce
// ---------------------------------------------------------------------------

type WooProduct = {
  id?: number;
  name?: string;
  permalink?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  date_modified?: string;
};

export function fromWooProduct(p: WooProduct, currency = "EUR"): NormalizedProduct {
  const sale = parseAmount(p.sale_price);
  const regular = parseAmount(p.regular_price);
  const plain = parseAmount(p.price);
  // sale_price è il prezzo effettivo quando il prodotto è in saldo; altrimenti
  // vale regular_price o price. `price` da solo è spesso "0" per i prodotti
  // con prezzi variabili, quindi non basta.
  const effective = sale && sale > 0 ? sale : regular ?? plain;
  const compare = sale && sale > 0 && regular && regular > sale ? regular : null;

  return {
    id: String(p.id ?? ""),
    title: p.name ?? "(senza nome)",
    url: p.permalink ?? null,
    price: effective !== null ? money(effective, currency) : null,
    compareAtPrice: compare !== null ? money(compare, currency) : null,
    // WooCommerce: instock | outofstock | onbackorder.
    available: p.stock_status ? p.stock_status === "instock" : null,
    sku: p.sku || null,
    updatedAt: p.date_modified ?? null,
  };
}

type WooOrder = {
  id?: number;
  number?: string;
  status?: string;
  total?: string;
  currency?: string;
  date_created?: string;
  billing?: { email?: string; first_name?: string; last_name?: string };
  line_items?: Array<{ name?: string; quantity?: number; total?: string }>;
};

export function fromWooOrder(o: WooOrder): NormalizedOrder {
  const currency = o.currency ?? "EUR";
  const total = parseAmount(o.total);
  const name = [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(" ");
  return {
    id: String(o.id ?? ""),
    number: o.number ? `#${o.number}` : `#${o.id ?? "?"}`,
    status: o.status ?? "unknown",
    total: total !== null ? money(total, currency) : null,
    currency,
    customerEmail: o.billing?.email ?? null,
    customerName: name || null,
    lines: (o.line_items ?? []).slice(0, 20).map((li) => {
      const t = parseAmount(li.total);
      return {
        title: li.name ?? "(articolo)",
        quantity: li.quantity ?? 1,
        total: t !== null ? money(t, currency) : null,
      };
    }),
    createdAt: o.date_created ?? null,
    url: null,
  };
}

// ---------------------------------------------------------------------------
// Shopify (stesso formato; da adottare quando si sbloccherà la fase successiva)
// ---------------------------------------------------------------------------

type ShopifyProductNode = {
  id?: string;
  title?: string;
  handle?: string;
  updatedAt?: string;
  variants?: { nodes?: Array<{ sku?: string | null; price?: string; availableForSale?: boolean }> };
};

export function fromShopifyProduct(p: ShopifyProductNode, currency = "EUR"): NormalizedProduct {
  const v = p.variants?.nodes?.[0];
  const amount = parseAmount(v?.price);
  return {
    id: p.id ?? "",
    title: p.title ?? "(senza nome)",
    url: null, // il dominio del tenant non è noto qui
    price: amount !== null ? money(amount, currency) : null,
    compareAtPrice: null,
    available: v?.availableForSale ?? null,
    sku: v?.sku ?? null,
    updatedAt: p.updatedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Formattazione per il modello
// ---------------------------------------------------------------------------

/** Una riga per prodotto: nome, prezzo, disponibilità, link. */
export function formatProduct(p: NormalizedProduct): string {
  const bits = [`- ${p.title}`];
  if (p.price) {
    const sale =
      p.compareAtPrice && p.compareAtPrice.amount !== p.price.amount
        ? ` (era ${p.compareAtPrice.amount} ${p.compareAtPrice.currency})`
        : "";
    bits.push(`— ${p.price.amount} ${p.price.currency}${sale}`);
  }
  if (p.available === false) bits.push("[esaurito]");
  if (p.sku) bits.push(`| sku: ${p.sku}`);
  bits.push(`| id: ${p.id}`);
  if (p.url) bits.push(`| ${p.url}`);
  return bits.join(" ");
}

/** Un blocco per ordine: stato, totale, cliente e prime righe. */
export function formatOrder(o: NormalizedOrder): string {
  const head = `${o.number} — ${o.status}${o.total ? ` — totale ${o.total.amount} ${o.currency}` : ""}`;
  const who = [
    o.customerName,
    o.customerEmail ? `<${o.customerEmail}>` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const lines = o.lines.length
    ? o.lines
        .slice(0, 10)
        .map((l) => `    ${l.quantity}× ${l.title}${l.total ? ` (${l.total.amount})` : ""}`)
        .join("\n")
    : "    (nessuna riga)";
  const more = o.lines.length > 10 ? `\n    …e altre ${o.lines.length - 10}` : "";
  return [
    head,
    who ? `  Cliente: ${who}` : "",
    o.createdAt ? `  Data: ${o.createdAt}` : "",
    `  Righe:\n${lines}${more}`,
    o.url ? `  ${o.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}